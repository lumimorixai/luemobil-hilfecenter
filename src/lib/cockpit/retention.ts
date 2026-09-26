/**
 * Aufbewahrung der Monitoring-Daten.
 *
 * Zwei Arten von Daten mit sehr unterschiedlichem Platzbedarf:
 * - Tageswerte (cockpit-daily): rund 100 Byte je Tag, also etwa 40 KB im Jahr.
 *   Sie werden nie gelöscht.
 * - Minuten-Checks (health-checks): rund 1.440 Zeilen am Tag. Über ein Jahr
 *   wären das mehrere hundert Megabyte. Sie werden deshalb zu einem Tageswert
 *   je Dienst verdichtet und danach aufgeräumt.
 *
 * Dadurch bleibt die Verfügbarkeit jahrelang nachvollziehbar, ohne dass die
 * Datenbank wächst. Der 24-Stunden-Streifen braucht ohnehin nur die jüngsten
 * Rohdaten.
 */
import type { Payload } from 'payload'
import type { AvailabilityDay } from './types'

/** So lange bleiben die Minuten-Checks erhalten (Tage). */
export function rohdatenTage(): number {
  const n = Number(process.env.HEALTH_RETENTION_DAYS || 35)
  return Number.isFinite(n) && n >= 2 ? Math.floor(n) : 35
}

type CheckDoc = {
  checkedAt: string
  status?: Record<string, { ok?: boolean; configured?: boolean }>
}

/**
 * Verdichtet die Minuten-Checks eines Tages zu je einem Wert pro Dienst und
 * schreibt sie in den Tageswert. Idempotent: mehrfaches Ausführen ändert nichts.
 */
export async function verdichteTag(payload: Payload, dayIso: string): Promise<boolean> {
  const von = new Date(`${dayIso}T00:00:00`)
  const bis = new Date(von.getTime() + 24 * 60 * 60 * 1000)

  const found = await payload.find({
    collection: 'health-checks',
    where: {
      and: [
        { checkedAt: { greater_than_equal: von.toISOString() } },
        { checkedAt: { less_than: bis.toISOString() } },
      ],
    },
    sort: 'checkedAt',
    limit: 5000,
    depth: 0,
    overrideAccess: true,
  })
  const docs = found.docs as unknown as CheckDoc[]
  if (docs.length === 0) return false

  const proDienst: Record<string, AvailabilityDay> = {}
  for (const doc of docs) {
    for (const [key, s] of Object.entries(doc.status ?? {})) {
      if (s?.configured === false) continue
      const cur = (proDienst[key] ??= { samples: 0, downSamples: 0, uptimePct: 0 })
      cur.samples++
      if (!s?.ok) cur.downSamples++
    }
  }
  for (const v of Object.values(proDienst)) {
    v.uptimePct = v.samples ? Math.round(((v.samples - v.downSamples) / v.samples) * 1000) / 10 : 0
  }

  const tag = await payload.find({
    collection: 'cockpit-daily',
    where: { datum: { equals: dayIso } },
    limit: 1,
    overrideAccess: true,
  })
  const vorhanden = tag.docs[0]
  if (vorhanden) {
    await payload.update({
      collection: 'cockpit-daily',
      id: vorhanden.id,
      data: { availability: proDienst },
      overrideAccess: true,
    })
  } else {
    // Kein Tageswert vorhanden (der Aggregations-Job lief an dem Tag nicht):
    // Zeile mit Nullwerten anlegen, damit die Verfügbarkeit nicht verloren geht.
    await payload.create({
      collection: 'cockpit-daily',
      data: {
        datum: dayIso,
        logins: 0,
        loginErrors: 0,
        newUsers: 0,
        registrations: 0,
        availability: proDienst,
      },
      overrideAccess: true,
    })
  }
  return true
}

/**
 * Verdichtet alle Tage im Aufbewahrungsfenster und löscht danach die
 * Minuten-Checks, die älter sind. Gibt zurück, wie viele Tage verdichtet und
 * wie viele Rohzeilen gelöscht wurden.
 */
export async function verdichteUndRaeumeAuf(
  payload: Payload,
  opts: { tage?: number } = {},
): Promise<{ verdichtet: number; geloescht: number }> {
  const grenzeTage = opts.tage ?? rohdatenTage()
  const heute = new Date()
  let verdichtet = 0

  // Rückwärts über das Fenster laufen: Tage ohne Rohdaten brechen die Schleife
  // nicht ab, denn es kann Lücken geben (Job stand still).
  for (let i = 1; i <= grenzeTage; i++) {
    const d = new Date(heute.getTime() - i * 24 * 60 * 60 * 1000)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (await verdichteTag(payload, iso)) verdichtet++
  }

  const grenze = new Date(heute.getTime() - grenzeTage * 24 * 60 * 60 * 1000)
  const { docs: alt } = await payload.find({
    collection: 'health-checks',
    where: { checkedAt: { less_than: grenze.toISOString() } },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })
  let geloescht = 0
  if (alt.length > 0) {
    const res = await payload.delete({
      collection: 'health-checks',
      where: { checkedAt: { less_than: grenze.toISOString() } },
      overrideAccess: true,
    })
    geloescht = res.docs?.length ?? alt.length
  }

  return { verdichtet, geloescht }
}

/**
 * Langfrist-Uptime je Dienst aus den verdichteten Tageswerten.
 * Liefert null, wenn es noch keine verdichteten Tage gibt.
 */
export async function langfristUptime(
  payload: Payload,
  tage = 90,
): Promise<{ tage: number; proDienst: Record<string, number> } | null> {
  const von = new Date(Date.now() - tage * 24 * 60 * 60 * 1000)
  const iso = `${von.getFullYear()}-${String(von.getMonth() + 1).padStart(2, '0')}-${String(von.getDate()).padStart(2, '0')}`
  const found = await payload.find({
    collection: 'cockpit-daily',
    where: { datum: { greater_than_equal: iso } },
    limit: tage + 5,
    overrideAccess: true,
  })

  const summe: Record<string, { samples: number; down: number }> = {}
  let tageMitDaten = 0
  for (const doc of found.docs) {
    const a = doc.availability as Record<string, AvailabilityDay> | null | undefined
    if (!a || typeof a !== 'object') continue
    tageMitDaten++
    for (const [key, v] of Object.entries(a)) {
      const cur = (summe[key] ??= { samples: 0, down: 0 })
      cur.samples += v.samples ?? 0
      cur.down += v.downSamples ?? 0
    }
  }
  if (tageMitDaten === 0) return null

  const proDienst: Record<string, number> = {}
  for (const [key, v] of Object.entries(summe)) {
    proDienst[key] = v.samples ? Math.round(((v.samples - v.down) / v.samples) * 1000) / 10 : 0
  }
  return { tage: tageMitDaten, proDienst }
}
