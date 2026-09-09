/**
 * Störungs-Alerting: führt die Health-Checks aus, erkennt Zustandswechsel
 * (grün→rot nach N Fehlversuchen; rot→grün) und schickt E-Mails über den
 * vorhandenen Payload-Mail-Adapter. Persistiert jeden Lauf in health-checks
 * (Zustandsspeicher + Verfügbarkeits-Historie).
 *
 * „Nicht konfiguriert" (z. B. Login-Ampel ohne Testuser) gilt NICHT als Störung.
 */
import type { Payload } from 'payload'
import { getHealth } from './health'
import { alertEmail, alertThreshold } from './config'
import type { ServiceHealth } from './types'

type SvcKey = 'keycloak' | 'login' | 'database'
const LABELS: Record<SvcKey, string> = {
  keycloak: 'Keycloak',
  login: 'Login (Testkunde)',
  database: 'Datenbank',
}

export async function runHealthAlert(payload: Payload): Promise<{ wrote: boolean; alerts: number }> {
  const health = await getHealth()
  const threshold = alertThreshold()
  const to = alertEmail()

  const services: { key: SvcKey; h: ServiceHealth }[] = [
    { key: 'keycloak', h: health.keycloak },
    { key: 'login', h: health.login },
    { key: 'database', h: health.database },
  ]

  const found = await payload.find({
    collection: 'health-checks',
    sort: '-createdAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const prev = found.docs[0] as unknown as
    | { failCounts?: Record<string, number>; alertedDown?: string[] }
    | undefined
  const prevFail = prev?.failCounts ?? {}
  const alerted = new Set<string>(prev?.alertedDown ?? [])

  const failCounts: Record<string, number> = {}
  const events: { type: 'down' | 'up'; key: SvcKey; note?: string }[] = []

  for (const s of services) {
    const down = !s.h.ok && s.h.configured
    const count = down ? (prevFail[s.key] ?? 0) + 1 : 0
    failCounts[s.key] = count
    if (down && !alerted.has(s.key) && count >= threshold) {
      alerted.add(s.key)
      events.push({ type: 'down', key: s.key, note: s.h.note })
    } else if (!down && s.h.configured && alerted.has(s.key)) {
      alerted.delete(s.key)
      events.push({ type: 'up', key: s.key })
    }
  }

  const now = new Date()
  await payload.create({
    collection: 'health-checks',
    data: {
      checkedAt: now.toISOString(),
      status: { keycloak: health.keycloak, login: health.login, database: health.database },
      failCounts,
      alertedDown: [...alerted],
    },
    overrideAccess: true,
  })

  if (to && events.length > 0) {
    const stamp = now.toLocaleString('de-DE')
    const base = (process.env.APP_BASE_URL || '').replace(/\/$/, '')
    for (const e of events) {
      const label = LABELS[e.key]
      const subject =
        e.type === 'down'
          ? `⚠ LüMobil-Cockpit — Störung: ${label}`
          : `✓ LüMobil-Cockpit — ${label} wieder verfügbar`
      const text =
        e.type === 'down'
          ? `Störung erkannt: ${label} ist nicht erreichbar${e.note ? ` (${e.note})` : ''}.\n` +
            `Zeit: ${stamp}\nCockpit: ${base}/cockpit`
          : `Entwarnung: ${label} ist wieder verfügbar.\nZeit: ${stamp}\nCockpit: ${base}/cockpit`
      try {
        await payload.sendEmail({ to, subject, text })
        payload.logger.info(`Alert-Mail versendet: ${subject}`)
      } catch (err) {
        payload.logger.error(`Alert-Mail (${label}) fehlgeschlagen: ${(err as Error).message}`)
      }
    }
  }

  return { wrote: true, alerts: events.length }
}
