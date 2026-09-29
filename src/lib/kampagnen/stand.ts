/**
 * Der tatsächliche Stand aller Kampagnen — in einer einzigen Abfrage.
 *
 * Die Zähler an der Kampagne (faelleOffen und so weiter) werden fortgeschrieben
 * und können hinterherhinken: Fälle entfallen auch, ohne dass jemand ein
 * Ergebnis erfasst — etwa wenn beim Zuteilen auffällt, dass die Person
 * inzwischen ein Konto hat. Die Übersicht soll aber nicht lügen, deshalb zählt
 * sie beim Anzeigen nach.
 *
 * Ein GROUP BY über alle Kampagnen statt einer Abfrage je Kampagne und Status:
 * Bei zehn Kampagnen wären das sonst fünfzig Abfragen für eine Seite.
 */
import type { Payload } from 'payload'
import { payloadClient } from '../content'
import { LEERER_STAND, type Stand } from './standTypen'

export { GRUND_TEXT, LEERER_STAND, type Stand } from './standTypen'

type Adapter = {
  drizzle: unknown
  execute(args: { drizzle: unknown; raw: string }): Promise<unknown>
}

function zeilen(antwort: unknown): Record<string, unknown>[] {
  if (Array.isArray(antwort)) return antwort as Record<string, unknown>[]
  const o = antwort as { rows?: unknown }
  return Array.isArray(o?.rows) ? (o.rows as Record<string, unknown>[]) : []
}

export async function standJeKampagne(payloadOpt?: Payload): Promise<Map<string, Stand>> {
  const payload = payloadOpt ?? (await payloadClient())
  const adapter = payload.db as unknown as Adapter
  const karte = new Map<string, Stand>()

  // Reine Aggregation ohne Parameter — es fließt nichts von außen ein.
  const antwort = await adapter.execute({
    drizzle: adapter.drizzle,
    raw: `SELECT kampagne_id, status, entfallen_grund, COUNT(*) AS anzahl
            FROM kampagnen_faelle
           GROUP BY kampagne_id, status, entfallen_grund`,
  })

  for (const z of zeilen(antwort)) {
    const id = String(z.kampagne_id ?? '')
    if (!id) continue
    const stand = karte.get(id) ?? { ...LEERER_STAND, gruende: {} }
    const anzahl = Number(z.anzahl ?? 0)
    const status = String(z.status ?? '')
    stand.gesamt += anzahl
    if (status === 'offen') stand.offen += anzahl
    else if (status === 'in_arbeit') stand.inArbeit += anzahl
    else if (status === 'erledigt') stand.erledigt += anzahl
    else if (status === 'entfaellt') {
      stand.entfallen += anzahl
      const grund = String(z.entfallen_grund ?? 'sonstiges')
      stand.gruende[grund] = (stand.gruende[grund] ?? 0) + anzahl
    }
    karte.set(id, stand)
  }
  return karte
}
