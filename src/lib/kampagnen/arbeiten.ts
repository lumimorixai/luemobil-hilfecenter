/**
 * Der Arbeitsplatz: Fälle zuteilen und Ergebnisse erfassen.
 *
 * Zwei Dinge entscheiden hier über die Brauchbarkeit:
 *
 * 1. **Zuteilen muss atomar sein.** Zwei Personen dürfen denselben Fall nicht
 *    bekommen — sonst ruft jemand zweimal an. Deshalb wird in einer einzigen
 *    Anweisung gesperrt und gelesen, nicht erst gesucht und dann geschrieben.
 * 2. **Niemand wird angerufen, der schon ein Konto hat.** Beim Zuteilen wird
 *    einzeln gegen Keycloak geprüft — hier zählt der aktuelle Stand, nicht der
 *    schnelle aus dem Sammelabgleich.
 *
 * Es gibt keinen Weg, sich einen Fall auszusuchen. Das verhindert Rosinen-
 * picken und macht die Zuteilung nachvollziehbar.
 */
import type { Payload } from 'payload'
import { payloadClient } from '../content'
import { findUserByEmail } from '../keycloak'
import { KampagnenFehler, zaehlerAktualisieren } from './erzeugen'
import { schluesselVon } from './regeln'

export type Fall = {
  id: number | string
  vorname: string
  nachname: string
  telefon: string
  email: string
  kundennummer: string
  produktnummer: string
  geburtsdatum: string | null
  merkmale: Record<string, string> | null
  versuche: number
  letzterVersuchAm: string | null
  gesperrtBis: string | null
  wiedervorlageAm: string | null
}

export type Verlauf = {
  zeitpunkt: string
  bearbeiter: string
  ergebnisCode: string
  notiz: string
}

/**
 * Warum Fälle beim Zuteilen übersprungen wurden — je Grund gezählt.
 *
 * Ohne diese Aufschlüsselung stünde am Arbeitsplatz nur „kein Fall offen",
 * während im Hintergrund die halbe Liste verschwindet. Wer arbeitet, muss
 * sehen, was mit den Fällen geschehen ist.
 */
export type Uebersprungen = { konto: number; widerspruch: number }

export const KEINE_UEBERSPRUNGEN: Uebersprungen = { konto: 0, widerspruch: 0 }

export type Zuteilung =
  | { art: 'fall'; fall: Fall; verlauf: Verlauf[]; uebersprungen: Uebersprungen }
  | { art: 'leer'; grund: string; uebersprungen: Uebersprungen }

/** Wie viele Fälle ein Zuteilungsversuch höchstens überspringt. */
const MAX_UEBERSPRUNGEN = 25

/**
 * Der Ausschnitt des Payload-Adapters, den die Zuteilung braucht.
 *
 * `execute` nimmt rohes SQL als Zeichenkette — das ist der einzige Weg zu
 * `FOR UPDATE SKIP LOCKED`, ohne drizzle-orm als eigene Abhängigkeit
 * aufzunehmen (Payload bringt es nur transitiv mit).
 */
type DrizzleAdapter = {
  drizzle: unknown
  name?: string
  execute(args: { drizzle: unknown; raw: string }): Promise<unknown>
}

function adapterVon(payload: Payload): { adapter: DrizzleAdapter; istPostgres: boolean } {
  const adapter = payload.db as unknown as DrizzleAdapter
  return { adapter, istPostgres: String(adapter.name ?? '').includes('postgres') }
}

/**
 * Werte für rohes SQL: Es gibt in dieser Schnittstelle keine Platzhalter, also
 * darf nichts Ungeprüftes hinein. Zahlen werden erzwungen, Zeitstempel selbst
 * erzeugt, und die einzige Zeichenkette — die Kennung der bearbeitenden Person
 * aus dem Keycloak-Token — muss diesem engen Muster entsprechen.
 */
const KENNUNG_MUSTER = /^[A-Za-z0-9._:@|-]{1,64}$/

function alsZahl(wert: number | string, was: string): number {
  const n = Number(wert)
  if (!Number.isFinite(n)) throw new KampagnenFehler(`Ungültige ${was}.`)
  return n
}

function alsKennung(wert: string): string {
  if (!KENNUNG_MUSTER.test(wert)) {
    throw new KampagnenFehler('Die Kennung der angemeldeten Person hat ein unerwartetes Format.')
  }
  return wert
}

/** Zeilen aus einer execute-Antwort holen — die Treiber antworten verschieden. */
function zeilenAus(antwort: unknown): Record<string, unknown>[] {
  if (Array.isArray(antwort)) return antwort as Record<string, unknown>[]
  const o = antwort as { rows?: unknown }
  return Array.isArray(o?.rows) ? (o.rows as Record<string, unknown>[]) : []
}

/**
 * Einen Fall sperren und zurückgeben — atomar.
 *
 * Postgres: `FOR UPDATE SKIP LOCKED` überspringt Zeilen, die eine andere
 * Sitzung gerade sperrt; zwei gleichzeitige Anfragen bekommen dadurch
 * verschiedene Fälle. SQLite kennt das nicht, schreibt aber ohnehin nur eine
 * Verbindung zur Zeit — dort genügt die Bedingung in der UPDATE-Anweisung.
 */
async function naechstenSperren(
  payload: Payload,
  kampagneId: number | string,
  bearbeiter: string,
  haltefristMin: number,
  maxVersuche: number,
): Promise<number | null> {
  const { adapter, istPostgres } = adapterVon(payload)
  const kampagne = alsZahl(kampagneId, 'Kampagne')
  const versuche = alsZahl(maxVersuche, 'Höchstzahl Versuche')
  const wer = alsKennung(bearbeiter)
  const jetzt = new Date().toISOString()
  const bis = new Date(Date.now() + alsZahl(haltefristMin, 'Haltefrist') * 60_000).toISOString()

  // Ein Fall ist zu haben, wenn er offen ist oder seine Haltefrist abgelaufen
  // ist (jemand hat den Browser geschlossen) — und wenn keine Wiedervorlage in
  // der Zukunft liegt.
  const bedingung = `
        kampagne_id = ${kampagne}
    AND versuche < ${versuche}
    AND (
          status = 'offen'
       OR (status = 'in_arbeit' AND (gesperrt_bis IS NULL OR gesperrt_bis < '${jetzt}'))
    )
    AND (wiedervorlage_am IS NULL OR wiedervorlage_am <= '${jetzt}')`

  const sperrklausel = istPostgres ? 'FOR UPDATE SKIP LOCKED' : ''

  const antwort = await adapter.execute({
    drizzle: adapter.drizzle,
    raw: `
      UPDATE kampagnen_faelle
         SET status = 'in_arbeit',
             gesperrt_von = '${wer}',
             gesperrt_bis = '${bis}',
             updated_at = '${jetzt}'
       WHERE id = (
         SELECT id FROM kampagnen_faelle
          WHERE ${bedingung}
          ORDER BY wiedervorlage_am ASC, versuche ASC, id ASC
          LIMIT 1
          ${sperrklausel}
       )
       AND (
             status = 'offen'
          OR (status = 'in_arbeit' AND (gesperrt_bis IS NULL OR gesperrt_bis < '${jetzt}'))
       )
      RETURNING id
    `,
  })

  const id = zeilenAus(antwort)[0]?.id
  return id == null ? null : Number(id)
}

async function fallLesen(payload: Payload, id: number | string): Promise<Fall | null> {
  const d = await payload.findByID({
    collection: 'kampagnen-faelle',
    id,
    depth: 0,
    overrideAccess: true,
  })
  if (!d) return null
  return {
    id: d.id,
    vorname: d.vorname ?? '',
    nachname: d.nachname ?? '',
    telefon: d.telefon ?? '',
    email: d.email ?? '',
    kundennummer: d.kundennummer ?? '',
    produktnummer: d.produktnummer ?? '',
    geburtsdatum: d.geburtsdatum ?? null,
    merkmale: (d.merkmale as Record<string, string> | null) ?? null,
    versuche: d.versuche ?? 0,
    letzterVersuchAm: d.letzterVersuchAm ?? null,
    gesperrtBis: d.gesperrtBis ?? null,
    wiedervorlageAm: d.wiedervorlageAm ?? null,
  }
}

async function verlaufLesen(payload: Payload, fallId: number | string): Promise<Verlauf[]> {
  const res = await payload.find({
    collection: 'kampagnen-kontakte',
    where: { fall: { equals: fallId } },
    sort: '-zeitpunkt',
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })
  return res.docs.map((d) => ({
    zeitpunkt: d.zeitpunkt,
    bearbeiter: d.bearbeiterName || d.bearbeiter,
    ergebnisCode: d.ergebnisCode,
    notiz: d.notiz ?? '',
  }))
}

/** Fall stilllegen, ohne ihn als bearbeitet zu zählen. */
async function fallEntfaellt(
  payload: Payload,
  id: number | string,
  grund: string,
  zusatz: Record<string, unknown> = {},
): Promise<void> {
  await payload.update({
    collection: 'kampagnen-faelle',
    id,
    data: {
      status: 'entfaellt',
      entfallenGrund: grund,
      gesperrtVon: null,
      gesperrtBis: null,
      abschlussAm: new Date().toISOString(),
      ...zusatz,
    } as never,
    overrideAccess: true,
  })
}

/**
 * Den nächsten Fall zuteilen.
 *
 * Fälle, die dabei hinfällig werden — Konto inzwischen vorhanden, Sperrliste —
 * werden stillgelegt und übersprungen, nicht angezeigt.
 */
export async function naechsterFall(
  kampagneId: number | string,
  bearbeiter: string,
): Promise<Zuteilung> {
  const payload = await payloadClient()
  const kampagne = await payload.findByID({
    collection: 'kampagnen',
    id: kampagneId,
    depth: 0,
    overrideAccess: true,
  })
  if (!kampagne) throw new KampagnenFehler('Kampagne nicht gefunden.')
  if (kampagne.status !== 'aktiv') {
    throw new KampagnenFehler(
      `Die Kampagne ist nicht aktiv (Status „${kampagne.status}"). Es werden keine Fälle ausgegeben.`,
    )
  }

  const haltefrist = kampagne.sperreMinuten ?? 15
  const maxVersuche = kampagne.maxVersuche ?? 3
  const uebersprungen: Uebersprungen = { konto: 0, widerspruch: 0 }
  const summe = () => uebersprungen.konto + uebersprungen.widerspruch

  /*
   * Entfällt beim Zuteilen etwas, stimmen die gespeicherten Zähler der
   * Kampagne nicht mehr — die Leitung sähe „offen", wo nichts mehr offen ist.
   * Deshalb am Ende jedes Laufs nachziehen, der etwas aussortiert hat.
   */
  const zaehlerNachziehen = async () => {
    if (summe() === 0) return
    try {
      await zaehlerAktualisieren(kampagne.id)
    } catch (err) {
      console.warn('[kampagnen] Zähler nach Zuteilung nicht aktualisiert:', (err as Error).message)
    }
  }

  for (let i = 0; i < MAX_UEBERSPRUNGEN; i++) {
    const id = await naechstenSperren(payload, kampagne.id, bearbeiter, haltefrist, maxVersuche)
    if (id == null) {
      await zaehlerNachziehen()
      return {
        art: 'leer',
        grund:
          summe() > 0
            ? 'Es ist kein weiterer Fall offen.'
            : 'Es ist derzeit kein Fall offen. Entweder sind alle bearbeitet, oder die übrigen stehen auf Wiedervorlage.',
        uebersprungen,
      }
    }

    const fall = await fallLesen(payload, id)
    if (!fall) continue

    // Sperrliste: Ein Widerspruch kann nach dem Erzeugen der Liste eingegangen sein.
    const schluessel = schluesselVon({
      email: fall.email,
      telefon: fall.telefon,
      kundennummer: fall.kundennummer,
    })
    if (schluessel) {
      const gesperrt = await payload.find({
        collection: 'kampagnen-sperrliste',
        where: { schluessel: { equals: schluessel } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (gesperrt.docs.length > 0) {
        await fallEntfaellt(payload, fall.id, 'widerspruch')
        uebersprungen.widerspruch++
        continue
      }
    }

    // Konto inzwischen vorhanden? Dann ist der Anlass entfallen.
    if (fall.email) {
      try {
        const konto = await findUserByEmail(fall.email)
        if (konto) {
          await fallEntfaellt(payload, fall.id, 'konto_vorhanden', {
            kontoVorhanden: true,
            kontoGeprueftAm: new Date().toISOString(),
          })
          uebersprungen.konto++
          continue
        }
        await payload.update({
          collection: 'kampagnen-faelle',
          id: fall.id,
          data: { kontoVorhanden: false, kontoGeprueftAm: new Date().toISOString() } as never,
          overrideAccess: true,
        })
      } catch (err) {
        // Keycloak ist nicht erreichbar. Den Fall trotzdem ausgeben und den
        // Grund festhalten — ein stiller Ausfall wäre schlimmer als ein
        // Anruf bei jemandem, der vielleicht schon ein Konto hat.
        console.warn(
          `[kampagnen] Konto-Abgleich für Fall ${fall.id} nicht möglich: ${(err as Error).message}`,
        )
      }
    }

    await zaehlerNachziehen()
    const verlauf = await verlaufLesen(payload, fall.id)
    return { art: 'fall', fall: (await fallLesen(payload, fall.id)) ?? fall, verlauf, uebersprungen }
  }

  await zaehlerNachziehen()
  return {
    art: 'leer',
    grund: `Es wurden ${MAX_UEBERSPRUNGEN} Fälle geprüft, die alle hinfällig waren. Bitte noch einmal versuchen.`,
    uebersprungen,
  }
}

/** Einen zugeteilten Fall ohne Ergebnis zurückgeben. */
export async function fallFreigeben(fallId: number | string, bearbeiter: string): Promise<void> {
  const payload = await payloadClient()
  const fall = await payload.findByID({
    collection: 'kampagnen-faelle',
    id: fallId,
    depth: 0,
    overrideAccess: true,
  })
  if (!fall) throw new KampagnenFehler('Fall nicht gefunden.')
  if (fall.gesperrtVon && fall.gesperrtVon !== bearbeiter) {
    throw new KampagnenFehler('Dieser Fall gehört gerade jemand anderem.')
  }
  await payload.update({
    collection: 'kampagnen-faelle',
    id: fallId,
    data: { status: 'offen', gesperrtVon: null, gesperrtBis: null } as never,
    overrideAccess: true,
  })
}

export type ErgebnisEingabe = {
  fall: number | string
  ergebnis: string
  notiz?: string
  wiedervorlageAm?: string | null
  dauerSekunden?: number | null
}

/**
 * Ergebnis erfassen: Kontaktversuch protokollieren und den Fall fortschreiben.
 *
 * Was mit dem Fall geschieht, steht nicht im Code, sondern an der Kampagne
 * (Wirkung des gewählten Ergebnisses). Ein neues Szenario braucht deshalb
 * keinen neuen Zweig hier.
 */
export async function ergebnisErfassen(
  eingabe: ErgebnisEingabe,
  bearbeiter: { kennung: string; name: string },
): Promise<{ wirkung: string }> {
  const payload = await payloadClient()
  const fall = await payload.findByID({
    collection: 'kampagnen-faelle',
    id: eingabe.fall,
    depth: 0,
    overrideAccess: true,
  })
  if (!fall) throw new KampagnenFehler('Fall nicht gefunden.')
  if (fall.gesperrtVon && fall.gesperrtVon !== bearbeiter.kennung) {
    throw new KampagnenFehler(
      'Dieser Fall gehört inzwischen jemand anderem. Ihr Ergebnis wurde nicht gespeichert.',
    )
  }

  const kampagneId = typeof fall.kampagne === 'object' ? fall.kampagne.id : fall.kampagne
  const kampagne = await payload.findByID({
    collection: 'kampagnen',
    id: kampagneId as number | string,
    depth: 0,
    overrideAccess: true,
  })
  if (!kampagne) throw new KampagnenFehler('Kampagne nicht gefunden.')

  const katalog = (kampagne.ergebnisse ?? []) as {
    code?: string | null
    label?: string | null
    wirkung?: string | null
    standardWiedervorlageTage?: number | null
    notizPflicht?: boolean | null
  }[]
  const gewaehlt = katalog.find((e) => e.code === eingabe.ergebnis)
  if (!gewaehlt) {
    throw new KampagnenFehler('Dieses Ergebnis gehört nicht zu dieser Kampagne.')
  }

  const notiz = String(eingabe.notiz ?? '').trim().slice(0, 1000)
  if (gewaehlt.notizPflicht && !notiz) {
    throw new KampagnenFehler(`Für „${gewaehlt.label}" ist eine Notiz erforderlich.`)
  }

  const jetzt = new Date()
  const versuche = (fall.versuche ?? 0) + 1
  const wirkung = gewaehlt.wirkung ?? 'abschluss'

  // 1. Kontaktversuch protokollieren — auch wenn der Fall danach entfällt.
  await payload.create({
    collection: 'kampagnen-kontakte',
    data: {
      fall: fall.id,
      kampagne: kampagneId,
      zeitpunkt: jetzt.toISOString(),
      bearbeiter: bearbeiter.kennung,
      bearbeiterName: bearbeiter.name,
      kanal: kampagne.kanal === 'email' ? 'email' : kampagne.kanal === 'telefon' ? 'telefon' : 'notiz',
      ergebnisCode: gewaehlt.code,
      notiz,
      dauerSekunden: eingabe.dauerSekunden ?? null,
      naechsteWiedervorlage: eingabe.wiedervorlageAm ?? null,
    } as never,
    overrideAccess: true,
  })

  // 2. Fall fortschreiben
  const daten: Record<string, unknown> = {
    ergebnis: gewaehlt.code,
    versuche,
    letzterVersuchAm: jetzt.toISOString(),
    gesperrtVon: null,
    gesperrtBis: null,
  }

  if (wirkung === 'wiedervorlage') {
    const tage = gewaehlt.standardWiedervorlageTage ?? 7
    const ziel = eingabe.wiedervorlageAm
      ? new Date(eingabe.wiedervorlageAm)
      : new Date(jetzt.getTime() + tage * 24 * 60 * 60 * 1000)
    daten.status = 'offen'
    daten.wiedervorlageAm = ziel.toISOString()
    daten.wiedervorlageFuer = bearbeiter.kennung
  } else if (wirkung === 'erneut') {
    // Höchstzahl erreicht? Dann nicht endlos weiterversuchen.
    if (versuche >= (kampagne.maxVersuche ?? 3)) {
      daten.status = 'entfaellt'
      daten.entfallenGrund = 'max_versuche'
      daten.abschlussAm = jetzt.toISOString()
    } else {
      daten.status = 'offen'
      daten.wiedervorlageAm = null
    }
  } else if (wirkung === 'entfaellt') {
    daten.status = 'entfaellt'
    daten.entfallenGrund = 'kein_kontakt'
    daten.abschlussAm = jetzt.toISOString()
  } else if (wirkung === 'sperren') {
    daten.status = 'entfaellt'
    daten.entfallenGrund = 'widerspruch'
    daten.abschlussAm = jetzt.toISOString()
    await sperreEintragen(payload, fall, bearbeiter.kennung, notiz)
  } else {
    daten.status = 'erledigt'
    daten.abschlussAm = jetzt.toISOString()
  }

  await payload.update({
    collection: 'kampagnen-faelle',
    id: fall.id,
    data: daten as never,
    overrideAccess: true,
  })

  return { wirkung }
}

/**
 * Widerspruch festhalten — kampagnenübergreifend.
 *
 * E-Mail und Telefonnummer werden getrennt eingetragen: Wer am Telefon
 * widerspricht, will meist auch keine E-Mail, und die nächste Liste kennt
 * vielleicht nur eines von beiden.
 */
async function sperreEintragen(
  payload: Payload,
  fall: { email?: string | null; telefon?: string | null; kundennummer?: string | null },
  bearbeiter: string,
  notiz: string,
): Promise<void> {
  const eintraege: { schluessel: string; art: 'email' | 'telefon' }[] = []
  if (fall.email) eintraege.push({ schluessel: `mail:${fall.email.toLowerCase()}`, art: 'email' })
  if (fall.telefon) eintraege.push({ schluessel: `tel:${fall.telefon}`, art: 'telefon' })
  if (eintraege.length === 0 && fall.kundennummer) {
    eintraege.push({ schluessel: `kunde:${fall.kundennummer}`, art: 'email' })
  }

  for (const e of eintraege) {
    const da = await payload.find({
      collection: 'kampagnen-sperrliste',
      where: { schluessel: { equals: e.schluessel } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (da.docs.length > 0) continue
    await payload.create({
      collection: 'kampagnen-sperrliste',
      data: {
        schluessel: e.schluessel,
        art: e.art,
        grund: 'widerspruch',
        gueltigAb: new Date().toISOString(),
        angelegtVon: bearbeiter,
        notiz: notiz.slice(0, 200),
      } as never,
      overrideAccess: true,
    })
  }
}
