/**
 * Kampagnen anlegen und ändern — die Schreibseite der Leitungsansicht.
 *
 * Payload lässt für `kampagnen` weder create noch update zu; geschrieben wird
 * nur hier mit `overrideAccess`. Damit gibt es genau eine Stelle, an der die
 * Prüfungen stehen, statt einmal im Admin und einmal im Cockpit.
 */
import { payloadClient } from '../content'
import { KampagnenFehler } from './erzeugen'
import { OPERATOREN, feldBekannt, type Regel } from './regeln'

/** Was die Oberfläche schicken darf. Alles andere wird verworfen. */
export type KampagnenEingabe = {
  name?: string
  kennung?: string
  beschreibung?: string
  gespraechsleitfaden?: string
  kanal?: string
  status?: string
  rechtsgrundlage?: string
  herkunft?: string
  loeschenNachTagen?: number
  maxVersuche?: number
  sperreMinuten?: number
  kontoAbgleich?: string
  regelVerknuepfung?: string
  regeln?: Regel[]
  ergebnisse?: {
    code?: string
    label?: string
    wirkung?: string
    standardWiedervorlageTage?: number | null
    notizPflicht?: boolean
  }[]
}

const KANAELE = new Set(['telefon', 'email', 'brief', 'sonstiges'])
const STATUS = new Set(['entwurf', 'aktiv', 'pausiert', 'beendet'])
const WIRKUNGEN = new Set(['abschluss', 'wiedervorlage', 'erneut', 'entfaellt', 'sperren'])
const KONTO_ABGLEICH = new Set(['aus', 'ueberspringen', 'hinweis'])

const text = (v: unknown, max: number): string => String(v ?? '').trim().slice(0, max)

function zahl(v: unknown, standard: number, min: number, max: number): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return standard
  return Math.min(max, Math.max(min, Math.round(n)))
}

/** Aus dem Namen eine Kennung ableiten, wenn keine angegeben wurde. */
export function kennungAus(name: string): string {
  const basis = name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return basis || `kampagne-${Date.now()}`
}

/**
 * Prüft und normalisiert die Eingabe. Wirft KampagnenFehler mit einem Satz,
 * der in der Oberfläche stehen kann — keine Feldnamen, keine Codes.
 */
function pruefe(eingabe: KampagnenEingabe, neu: boolean): Record<string, unknown> {
  const daten: Record<string, unknown> = {}

  if (neu || eingabe.name !== undefined) {
    const name = text(eingabe.name, 120)
    if (!name) throw new KampagnenFehler('Die Kampagne braucht einen Namen.')
    daten.name = name
  }

  if (neu || eingabe.kennung !== undefined) {
    const roh = text(eingabe.kennung, 60)
    const kennung = roh ? kennungAus(roh) : kennungAus(String(daten.name ?? ''))
    if (!kennung) throw new KampagnenFehler('Die Kennung darf nicht leer sein.')
    daten.kennung = kennung
  }

  if (eingabe.beschreibung !== undefined) daten.beschreibung = text(eingabe.beschreibung, 2000)
  if (eingabe.gespraechsleitfaden !== undefined) {
    daten.gespraechsleitfaden = text(eingabe.gespraechsleitfaden, 5000)
  }
  if (eingabe.rechtsgrundlage !== undefined) {
    daten.rechtsgrundlage = text(eingabe.rechtsgrundlage, 300)
  }
  if (eingabe.herkunft !== undefined) daten.herkunft = text(eingabe.herkunft, 1000)

  if (neu || eingabe.kanal !== undefined) {
    const kanal = text(eingabe.kanal, 20) || 'telefon'
    if (!KANAELE.has(kanal)) throw new KampagnenFehler('Diesen Kanal gibt es nicht.')
    daten.kanal = kanal
  }

  if (eingabe.status !== undefined) {
    const status = text(eingabe.status, 20)
    if (!STATUS.has(status)) throw new KampagnenFehler('Diesen Status gibt es nicht.')
    daten.status = status
  }

  if (neu || eingabe.loeschenNachTagen !== undefined) {
    daten.loeschenNachTagen = zahl(eingabe.loeschenNachTagen, 90, 1, 3650)
  }
  if (neu || eingabe.maxVersuche !== undefined) {
    daten.maxVersuche = zahl(eingabe.maxVersuche, 3, 1, 50)
  }
  if (neu || eingabe.sperreMinuten !== undefined) {
    daten.sperreMinuten = zahl(eingabe.sperreMinuten, 15, 1, 480)
  }

  if (neu || eingabe.kontoAbgleich !== undefined) {
    const wahl = text(eingabe.kontoAbgleich, 20) || 'aus'
    if (!KONTO_ABGLEICH.has(wahl)) {
      throw new KampagnenFehler('Diese Einstellung für den Konto-Abgleich gibt es nicht.')
    }
    daten.kontoAbgleich = wahl
  }

  if (eingabe.regelVerknuepfung !== undefined) {
    daten.regelVerknuepfung = eingabe.regelVerknuepfung === 'oder' ? 'oder' : 'und'
  }

  if (eingabe.regeln !== undefined) {
    if (eingabe.regeln.length > 30) {
      throw new KampagnenFehler('Mehr als 30 Regeln sind nicht vorgesehen.')
    }
    daten.regeln = eingabe.regeln.map((r, i) => {
      const feld = text(r.feld, 80)
      const operator = text(r.operator, 30)
      if (!feld) throw new KampagnenFehler(`Regel ${i + 1}: Es ist kein Feld ausgewählt.`)
      if (!feldBekannt(feld)) {
        throw new KampagnenFehler(
          `Regel ${i + 1}: Das Feld „${feld}" gibt es nicht. Merkmale hochgeladener Listen beginnen mit „merkmal:".`,
        )
      }
      if (!(operator in OPERATOREN)) {
        throw new KampagnenFehler(`Regel ${i + 1}: Diesen Vergleich gibt es nicht.`)
      }
      return { aktiv: r.aktiv !== false, feld, operator, wert: text(r.wert, 500) }
    })
  }

  if (eingabe.ergebnisse !== undefined) {
    if (eingabe.ergebnisse.length > 30) {
      throw new KampagnenFehler('Mehr als 30 Ergebnisse sind nicht vorgesehen.')
    }
    const codes = new Set<string>()
    daten.ergebnisse = eingabe.ergebnisse.map((e, i) => {
      const label = text(e.label, 80)
      if (!label) throw new KampagnenFehler(`Ergebnis ${i + 1}: Die Beschriftung fehlt.`)
      const code = text(e.code, 40) || kennungAus(label).replace(/-/g, '_')
      if (codes.has(code)) {
        throw new KampagnenFehler(`Das Kürzel „${code}" kommt zweimal vor.`)
      }
      codes.add(code)
      const wirkung = text(e.wirkung, 30) || 'abschluss'
      if (!WIRKUNGEN.has(wirkung)) {
        throw new KampagnenFehler(`Ergebnis ${i + 1}: Diese Wirkung gibt es nicht.`)
      }
      const tage =
        e.standardWiedervorlageTage == null || e.standardWiedervorlageTage === ('' as unknown)
          ? null
          : zahl(e.standardWiedervorlageTage, 7, 0, 365)
      return { code, label, wirkung, standardWiedervorlageTage: tage, notizPflicht: Boolean(e.notizPflicht) }
    })
  }

  return daten
}

/** Eine Kampagne kann erst aktiv werden, wenn das Nötige dasteht. */
function pruefeAktivierung(zustand: Record<string, unknown>): void {
  if (zustand.status !== 'aktiv') return
  if (!String(zustand.rechtsgrundlage ?? '').trim()) {
    throw new KampagnenFehler(
      'Ohne Rechtsgrundlage lässt sich die Kampagne nicht aktivieren. Bei Kontaktaufnahme gegenüber Verbrauchern ist neben der DSGVO auch § 7 UWG zu beachten.',
    )
  }
  const ergebnisse = (zustand.ergebnisse ?? []) as unknown[]
  if (ergebnisse.length === 0) {
    throw new KampagnenFehler(
      'Ohne mindestens ein mögliches Ergebnis hätte die Bearbeitung keinen Abschluss.',
    )
  }
}

export async function kampagneAnlegen(eingabe: KampagnenEingabe, bearbeiter: string) {
  const payload = await payloadClient()
  const daten = pruefe(eingabe, true)
  daten.status ??= 'entwurf'
  daten.erzeugtVon = bearbeiter
  pruefeAktivierung(daten)

  const schon = await payload.find({
    collection: 'kampagnen',
    where: { kennung: { equals: daten.kennung } },
    limit: 1,
    overrideAccess: true,
  })
  if (schon.docs.length > 0) {
    daten.kennung = `${daten.kennung}-${Date.now().toString(36).slice(-4)}`
  }

  return payload.create({
    collection: 'kampagnen',
    data: daten as never,
    overrideAccess: true,
  })
}

export async function kampagneSpeichern(
  id: number | string,
  eingabe: KampagnenEingabe,
): Promise<void> {
  const payload = await payloadClient()
  const vorher = await payload.findByID({
    collection: 'kampagnen',
    id,
    depth: 0,
    overrideAccess: true,
  })
  if (!vorher) throw new KampagnenFehler('Kampagne nicht gefunden.')

  const daten = pruefe(eingabe, false)
  // Gegen den Stand NACH der Änderung prüfen, nicht gegen die Eingabe allein:
  // Sonst ließe sich eine Kampagne aktivieren, indem man nur das Statusfeld
  // schickt und die fehlende Rechtsgrundlage unerwähnt lässt.
  pruefeAktivierung({ ...(vorher as unknown as Record<string, unknown>), ...daten })

  if (daten.kennung && daten.kennung !== vorher.kennung) {
    const schon = await payload.find({
      collection: 'kampagnen',
      where: { kennung: { equals: daten.kennung } },
      limit: 1,
      overrideAccess: true,
    })
    if (schon.docs.length > 0 && schon.docs[0].id !== vorher.id) {
      throw new KampagnenFehler('Diese Kennung ist schon vergeben.')
    }
  }

  await payload.update({ collection: 'kampagnen', id, data: daten as never, overrideAccess: true })
}

/**
 * Eine Kampagne löschen — nur solange sie keine Fälle hat.
 *
 * Mit Fällen würde ein Löschen Gesprächsprotokolle mitreißen, die aufbewahrt
 * werden müssen; dafür ist der Aufräumjob nach `loeschenNachTagen` zuständig.
 */
export async function kampagneLoeschen(id: number | string): Promise<void> {
  const payload = await payloadClient()
  const faelle = await payload.count({
    collection: 'kampagnen-faelle',
    where: { kampagne: { equals: id } },
    overrideAccess: true,
  })
  if (faelle.totalDocs > 0) {
    throw new KampagnenFehler(
      `Die Kampagne hat ${faelle.totalDocs} Fälle und lässt sich deshalb nicht löschen. Beenden Sie sie stattdessen — die Fälle werden nach der eingestellten Frist automatisch gelöscht.`,
    )
  }
  await payload.delete({ collection: 'kampagnen', id, overrideAccess: true })
}
