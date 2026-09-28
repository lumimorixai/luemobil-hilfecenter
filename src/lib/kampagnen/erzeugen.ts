/**
 * Fälle einer Kampagne aus dem Patris-Bestand erzeugen.
 *
 * Der Weg ist bewusst zweistufig: `ermittleFaelle` rechnet nur und schreibt
 * nichts, `faelleErzeugen` schreibt. So liefert derselbe Code den Trockenlauf,
 * den die Leitung vor dem Anlegen sieht — die angezeigte Zahl kann nicht von
 * der tatsächlich erzeugten abweichen, weil es dieselbe Rechnung ist.
 *
 * Erzeugen ist wiederholbar: Ein zweiter Lauf legt nur Fälle an, die noch nicht
 * in der Kampagne stehen. Bestehende Fälle werden nie überschrieben — sonst
 * ginge der Bearbeitungsstand verloren.
 */
import type { Payload, Where } from 'payload'
import { payloadClient } from '../content'
import { alleKontoEmails } from '../keycloak'
import {
  brauchtKontoAbgleich,
  normalisiereEmail,
  normalisiereTelefon,
  schluesselVon,
  trifftZu,
  type Kandidat,
  type Regel,
} from './regeln'

export type Bilanz = {
  /** Zeilen im Patris-Bestand. */
  geprueft: number
  /** Davon von den Regeln getroffen. */
  getroffen: number
  /** Neu anzulegen bzw. angelegt. */
  neu: number
  /** Aussortiert, mit Grund. */
  ohneKontakt: number
  dublette: number
  gesperrt: number
  schonVorhanden: number
  /** Stand des Konto-Abgleichs, falls eine Regel ihn brauchte. */
  kontenAbgeglichen: boolean
}

export type Entwurf = {
  schluessel: string
  email: string
  telefon: string
  telefonRoh: string
  vorname: string
  nachname: string
  kundennummer: string
  entitlementId: string
  produktnummer: string
  geburtsdatum: string | null
}

const LESEBLOCK = 1000
const SCHREIBBLOCK = 500

/** Der Patris-Bestand, blockweise — damit nie der ganze Bestand im Speicher liegt. */
async function* patrisZeilen(payload: Payload): AsyncGenerator<Kandidat[]> {
  for (let page = 1; ; page++) {
    const res = await payload.find({
      collection: 'patris-entitlements',
      limit: LESEBLOCK,
      page,
      depth: 0,
      sort: 'id',
      overrideAccess: true,
    })
    if (res.docs.length === 0) return
    yield res.docs.map((d) => ({
      email: d.email ?? '',
      telefon: d.phone ?? '',
      vorname: d.firstName ?? '',
      nachname: d.lastName ?? '',
      kundennummer: d.customerNumber ?? '',
      entitlementId: d.entitlementId,
      produktnummer: d.productNumber ?? '',
      produktname: d.productName ?? '',
      gueltigAb: d.validFrom ?? null,
      gueltigBis: d.validUntil ?? null,
      geburtsdatum: d.birthday ?? null,
    }))
    if (!res.hasNextPage) return
  }
}

/** Alle Schlüssel der Sperrliste. Sie ist klein; ein Satz im Speicher genügt. */
async function sperrSchluessel(payload: Payload): Promise<Set<string>> {
  const res = await payload.find({
    collection: 'kampagnen-sperrliste',
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  return new Set(res.docs.map((d) => d.schluessel))
}

/** Alle Schlüssel, die in dieser Kampagne schon einen Fall haben. */
async function bestehendeSchluessel(payload: Payload, kampagne: number | string): Promise<Set<string>> {
  const vorhanden = new Set<string>()
  for (let page = 1; ; page++) {
    const res = await payload.find({
      collection: 'kampagnen-faelle',
      where: { kampagne: { equals: kampagne } },
      limit: LESEBLOCK,
      page,
      depth: 0,
      overrideAccess: true,
    })
    for (const d of res.docs) vorhanden.add(d.schluessel)
    if (!res.hasNextPage || res.docs.length === 0) return vorhanden
  }
}

export class KampagnenFehler extends Error {}

/**
 * Rechnet aus, welche Fälle entstehen würden — ohne zu schreiben.
 *
 * Aussortiert wird in fester Reihenfolge, damit die Bilanz aufgeht: kein
 * Kontaktweg → Dublette im Lauf → Sperrliste → schon vorhanden.
 */
export async function ermittleFaelle(
  kampagneId: number | string,
): Promise<{ entwuerfe: Entwurf[]; bilanz: Bilanz; kampagne: Record<string, unknown> }> {
  const payload = await payloadClient()
  const kampagne = await payload.findByID({
    collection: 'kampagnen',
    id: kampagneId,
    depth: 0,
    overrideAccess: true,
  })
  if (!kampagne) throw new KampagnenFehler('Kampagne nicht gefunden.')

  const regeln = (kampagne.regeln ?? []) as Regel[]
  if (regeln.length === 0) {
    throw new KampagnenFehler(
      'Die Kampagne hat keine Auswahlregeln. Ohne Regeln wird keine Liste erzeugt — sonst stünde versehentlich der gesamte Bestand darin.',
    )
  }

  const verknuepfung = (kampagne.regelVerknuepfung === 'oder' ? 'oder' : 'und') as 'und' | 'oder'
  const kanal = kampagne.kanal === 'email' ? 'email' : 'telefon'

  const kontoEmails = brauchtKontoAbgleich(regeln) ? await alleKontoEmails() : null
  const gesperrt = await sperrSchluessel(payload)
  const vorhanden = await bestehendeSchluessel(payload, kampagne.id)

  const bilanz: Bilanz = {
    geprueft: 0,
    getroffen: 0,
    neu: 0,
    ohneKontakt: 0,
    dublette: 0,
    gesperrt: 0,
    schonVorhanden: 0,
    kontenAbgeglichen: kontoEmails !== null,
  }

  const entwuerfe: Entwurf[] = []
  const imLauf = new Set<string>()

  for await (const block of patrisZeilen(payload)) {
    for (const k of block) {
      bilanz.geprueft++
      if (!trifftZu(regeln, k, kontoEmails, verknuepfung)) continue
      bilanz.getroffen++

      const email = normalisiereEmail(k.email)
      const telefon = normalisiereTelefon(k.telefon)

      // Ein Fall ohne den Kontaktweg der Kampagne ist wertlos — und im
      // Arbeitsplatz würde er nur immer wieder ausgegeben.
      if (kanal === 'telefon' && !telefon) {
        bilanz.ohneKontakt++
        continue
      }
      if (kanal === 'email' && !email) {
        bilanz.ohneKontakt++
        continue
      }

      const schluessel = schluesselVon({ email, telefon, kundennummer: k.kundennummer })
      if (!schluessel) {
        bilanz.ohneKontakt++
        continue
      }
      // Mehrere Berechtigungen derselben Person ergeben einen Anruf, nicht drei.
      if (imLauf.has(schluessel)) {
        bilanz.dublette++
        continue
      }
      imLauf.add(schluessel)

      if (gesperrt.has(schluessel) || (telefon && gesperrt.has(`tel:${telefon}`)) || (email && gesperrt.has(`mail:${email}`))) {
        bilanz.gesperrt++
        continue
      }
      if (vorhanden.has(schluessel)) {
        bilanz.schonVorhanden++
        continue
      }

      entwuerfe.push({
        schluessel,
        email,
        telefon,
        telefonRoh: k.telefon,
        vorname: k.vorname,
        nachname: k.nachname,
        kundennummer: k.kundennummer,
        entitlementId: k.entitlementId,
        produktnummer: k.produktnummer,
        geburtsdatum: k.geburtsdatum,
      })
    }
  }

  bilanz.neu = entwuerfe.length
  return { entwuerfe, bilanz, kampagne: kampagne as unknown as Record<string, unknown> }
}

/** Ausschnitt der Drizzle-API für den Massen-Einfügevorgang. */
type DrizzleTx = {
  insert(table: unknown): { values(values: Record<string, unknown>[]): PromiseLike<unknown> }
}
type DrizzleDb = { transaction<T>(fn: (tx: DrizzleTx) => Promise<T>): Promise<T> }

/**
 * Erzeugt die Fälle wirklich. Alles in EINER Transaktion: Bricht der Lauf ab,
 * steht keine halbe Liste da, die niemand zuordnen kann.
 *
 * Direkt über Drizzle statt payload.create, weil die Local API je Datensatz
 * eine eigene Transaktion öffnet — bei einigen tausend Fällen dauert das
 * Minuten statt Sekunden.
 */
export async function faelleErzeugen(
  kampagneId: number | string,
  bearbeiter: string,
): Promise<Bilanz> {
  const { entwuerfe, bilanz, kampagne } = await ermittleFaelle(kampagneId)
  const payload = await payloadClient()

  if (entwuerfe.length > 0) {
    const adapter = payload.db as unknown as { drizzle: DrizzleDb; tables: Record<string, unknown> }
    const table = adapter.tables['kampagnen_faelle']
    if (!table) throw new Error('Tabelle kampagnen_faelle nicht gefunden')

    const jetzt = new Date().toISOString()
    await adapter.drizzle.transaction(async (tx) => {
      for (let i = 0; i < entwuerfe.length; i += SCHREIBBLOCK) {
        await tx.insert(table).values(
          entwuerfe.slice(i, i + SCHREIBBLOCK).map((e) => ({
            kampagne: kampagne.id,
            schluessel: e.schluessel,
            email: e.email,
            telefon: e.telefon,
            telefonRoh: e.telefonRoh,
            vorname: e.vorname,
            nachname: e.nachname,
            kundennummer: e.kundennummer,
            entitlementId: e.entitlementId,
            produktnummer: e.produktnummer,
            geburtsdatum: e.geburtsdatum,
            quelle: 'regel',
            status: 'offen',
            versuche: 0,
            createdAt: jetzt,
            updatedAt: jetzt,
          })),
        )
      }
    })
  }

  await zaehlerAktualisieren(kampagneId, {
    erzeugtAm: new Date().toISOString(),
    erzeugtVon: bearbeiter,
    quelle: kampagne.quelle === 'csv' || kampagne.quelle === 'beides' ? 'beides' : 'regel',
  })

  return bilanz
}

/**
 * Zählt die Fälle einer Kampagne neu und schreibt sie an die Kampagne.
 *
 * Gezählt statt hochgerechnet: Ein Zähler, der bei jedem Ergebnis mitgeführt
 * wird, läuft früher oder später aus dem Tritt. Drei count-Abfragen sind
 * billig genug, um stattdessen jedes Mal nachzusehen.
 */
export async function zaehlerAktualisieren(
  kampagneId: number | string,
  zusatz: Record<string, unknown> = {},
): Promise<{ gesamt: number; offen: number; erledigt: number }> {
  const payload = await payloadClient()
  const zaehle = async (where: Where) => {
    const res = await payload.count({
      collection: 'kampagnen-faelle',
      where: { and: [{ kampagne: { equals: kampagneId } }, where] },
      overrideAccess: true,
    })
    return res.totalDocs
  }

  const gesamt = (
    await payload.count({
      collection: 'kampagnen-faelle',
      where: { kampagne: { equals: kampagneId } },
      overrideAccess: true,
    })
  ).totalDocs
  const offen = await zaehle({ status: { in: ['offen', 'in_arbeit'] } })
  const erledigt = await zaehle({ status: { equals: 'erledigt' } })

  await payload.update({
    collection: 'kampagnen',
    id: kampagneId,
    data: { faelleGesamt: gesamt, faelleOffen: offen, faelleErledigt: erledigt, ...zusatz },
    overrideAccess: true,
  })

  return { gesamt, offen, erledigt }
}
