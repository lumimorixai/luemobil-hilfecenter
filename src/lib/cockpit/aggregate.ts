/**
 * Aggregation der Zeitreihe: schreibt Tageswerte (Logins, Fehler, neue User)
 * in die Collection cockpit-daily. Der Minuten-Job aktualisiert den heutigen
 * Datensatz per Upsert (nahezu Echtzeit); ältere Tage bleiben unverändert.
 */
import type { Payload } from 'payload'
import { getDayCounts } from '../keycloak'
import { lastDays, todayIso } from './date'

/** Legt den Tageswert an oder aktualisiert ihn. */
export async function upsertDay(payload: Payload, dayIso: string): Promise<void> {
  const counts = await getDayCounts(dayIso)
  const existing = await payload.find({
    collection: 'cockpit-daily',
    where: { datum: { equals: dayIso } },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.docs[0]) {
    await payload.update({
      collection: 'cockpit-daily',
      id: existing.docs[0].id,
      data: counts,
      overrideAccess: true,
    })
  } else {
    await payload.create({
      collection: 'cockpit-daily',
      data: { datum: dayIso, ...counts },
      overrideAccess: true,
    })
  }
}

/** Aktualisiert nur den heutigen Datensatz (Minuten-Job). */
export async function aggregateToday(payload: Payload): Promise<void> {
  await upsertDay(payload, todayIso())
}

/**
 * Füllt fehlende Tageswerte der letzten `days` Tage nach (einmalige
 * Initialisierung oder nach Ausfällen). Vorhandene Tage werden übersprungen.
 */
export async function backfill(payload: Payload, days = 14): Promise<number> {
  let written = 0
  for (const day of lastDays(days)) {
    const existing = await payload.find({
      collection: 'cockpit-daily',
      where: { datum: { equals: day } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs[0]) continue
    await upsertDay(payload, day)
    written++
  }
  return written
}
