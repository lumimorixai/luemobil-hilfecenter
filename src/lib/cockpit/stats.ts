/**
 * KPIs und Zeitreihen für die Cockpit-Startseite. Liest die persistierten
 * Tageswerte (Collection cockpit-daily) und ergänzt „heute" bei Bedarf live.
 * Im Mock-Modus wird eine vollständige 14-Tage-Serie erzeugt, damit die Demo
 * sofort aussagekräftig ist.
 */
import { payloadClient } from '../content'
import {
  getDayCounts,
  getErrorEvents,
  getEventsSince,
  getLoginsByClient,
  getMigratedCount,
  getSupportMetrics,
  getUserCreationTimestamps,
  usersCount,
} from '../keycloak'
import { isMock, kundenGesamt } from './config'
import { lastDays, todayIso } from './date'
import { explainError } from './errors'
import { mockIntradayHourly, mockIntradayMinutely, mockSeries } from './mockData'
import type {
  Anomaly,
  CockpitStats,
  CountPoint,
  DailyPoint,
  DayEvents,
  ErrorTypeAgg,
  Intraday,
  IntradayPoint,
  KcEvent,
  NewUsers,
  Operations,
} from './types'

/** Standard-Nenner im Mock, wenn COCKPIT_KUNDEN_GESAMT nicht gesetzt ist (≈18 %). */
const MOCK_KUNDEN_GESAMT = 7133

async function readSeries(): Promise<DailyPoint[]> {
  const days = lastDays(14)
  const payload = await payloadClient()
  const found = await payload.find({
    collection: 'cockpit-daily',
    where: { datum: { in: days } },
    limit: 60,
    overrideAccess: true,
  })

  const byDate = new Map(found.docs.map((d) => [d.datum, d]))
  let series: DailyPoint[] = days.map((datum) => {
    const row = byDate.get(datum)
    return {
      datum,
      logins: row?.logins ?? 0,
      loginErrors: row?.loginErrors ?? 0,
      newUsers: row?.newUsers ?? 0,
      registrations: row?.registrations ?? 0,
    }
  })

  // Mock: fehlt die Historie in der DB, komplette Demo-Serie verwenden.
  if (isMock() && found.docs.length < 3) {
    series = mockSeries(14)
  }

  // „Heute" live ergänzen, falls der Minuten-Job den Tag noch nicht geschrieben hat.
  const today = todayIso()
  const todayRow = series[series.length - 1]
  if (todayRow?.datum === today && todayRow.logins === 0 && todayRow.loginErrors === 0) {
    try {
      const live = await getDayCounts(today)
      series[series.length - 1] = { datum: today, ...live }
    } catch {
      // Live-Ergänzung ist optional; DB-Wert (0) bleibt bestehen.
    }
  }

  return series
}

export async function getStats(): Promise<CockpitStats> {
  const series = await readSeries()
  const today = series[series.length - 1]
  const yesterday = series[series.length - 2]

  const [totalUsers, totalMigrated] = await Promise.all([usersCount(), getMigratedCount()])
  const denom = kundenGesamt() || (isMock() ? MOCK_KUNDEN_GESAMT : 0)

  const successfulLogins = today?.logins ?? 0
  const failedLogins = today?.loginErrors ?? 0
  const attempts = successfulLogins + failedLogins
  const errorRatePct = attempts > 0 ? Math.round((failedLogins / attempts) * 1000) / 10 : 0
  const progressPct = denom > 0 ? Math.round((totalMigrated / denom) * 100) : 0

  // Trend der erfolgreichen Logins ggü. Vortag (in Prozent).
  const prev = yesterday?.logins ?? 0
  const loginTrendPct =
    prev > 0 ? Math.round(((successfulLogins - prev) / prev) * 100) : null

  // Kumulierte Migrationskurve, die am letzten Tag auf totalMigrated endet.
  const sumNew = series.reduce((s, p) => s + p.newUsers, 0)
  let running = totalMigrated - sumNew
  const cumulativeMigrated = series.map((p) => {
    running += p.newUsers
    return { datum: p.datum, total: running }
  })

  // Migrationen vs. Neuregistrierungen je Tag
  // (newUsers = an dem Tag angelegte föderierte = migrierte Nutzer).
  const migrationSeries = series.map((p) => ({
    datum: p.datum,
    migrated: p.newUsers,
    registered: p.registrations,
  }))

  const newRegistered = today?.registrations ?? 0
  const newMigrated = today?.newUsers ?? 0

  return {
    kpis: {
      successfulLogins,
      failedLogins,
      errorRatePct,
      newMigrated,
      totalMigrated,
      totalUsers,
      progressPct,
      kundenGesamt: denom,
    },
    series,
    cumulativeMigrated,
    migrationSeries,
    newRegistered,
    loginTrendPct,
    mock: isMock(),
  }
}

// --- Betriebs-/Support-Kennzahlen -------------------------------------------

/** Support (24 h + 7 Tage) + Logins je Client (Live aus der Event-API). */
export async function getOperations(): Promise<Operations> {
  const now = Date.now()
  const [support24h, support7d, loginsByClient] = await Promise.all([
    getSupportMetrics(now - 24 * 60 * 60 * 1000, now),
    getSupportMetrics(now - 7 * 24 * 60 * 60 * 1000, now),
    getLoginsByClient(now - 24 * 60 * 60 * 1000, now),
  ])
  return { support24h, support7d, loginsByClient, mock: isMock() }
}

// --- Neue Nutzer (mehrere Zeitfenster) --------------------------------------

function binCounts(
  ts: number[],
  startMs: number,
  bucketMs: number,
  count: number,
  label: (start: number) => string,
): CountPoint[] {
  const buckets: CountPoint[] = Array.from({ length: count }, (_, i) => ({
    label: label(startMs + i * bucketMs),
    count: 0,
  }))
  for (const t of ts) {
    const idx = Math.floor((t - startMs) / bucketMs)
    if (idx >= 0 && idx < count) buckets[idx].count++
  }
  return buckets
}

function dayLabel(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`
}

/** Neu angelegte Nutzer je Zeitfenster (letzte Stunde/24 h/7 Tage/30 Tage). */
export async function getNewUsers(): Promise<NewUsers> {
  const now = Date.now()
  const MIN = 60 * 1000
  const HOUR = 60 * MIN
  const DAY = 24 * HOUR
  const ts = await getUserCreationTimestamps(now - 30 * DAY)

  const hour = binCounts(ts, now - 12 * 5 * MIN, 5 * MIN, 12, minuteLabel)
  const day = binCounts(ts, now - 24 * HOUR, HOUR, 24, hourLabel)
  const week = binCounts(ts, now - 7 * DAY, DAY, 7, dayLabel)
  const month = binCounts(ts, now - 30 * DAY, DAY, 30, dayLabel)

  const inWin = (w: number) => ts.filter((t) => t >= now - w).length
  return {
    hour,
    day,
    week,
    month,
    totals: { hour: inWin(HOUR), day: inWin(DAY), week: inWin(7 * DAY), month: inWin(30 * DAY) },
    mock: isMock(),
  }
}

// --- Intraday-Reihen ---------------------------------------------------------

function bucketEvents(
  events: KcEvent[],
  startMs: number,
  bucketMs: number,
  count: number,
  label: (start: number) => string,
): IntradayPoint[] {
  const buckets: IntradayPoint[] = Array.from({ length: count }, (_, i) => ({
    label: label(startMs + i * bucketMs),
    logins: 0,
    loginErrors: 0,
  }))
  for (const e of events) {
    const idx = Math.floor((Date.parse(e.time) - startMs) / bucketMs)
    if (idx < 0 || idx >= count) continue
    if (e.type === 'LOGIN') buckets[idx].logins++
    else buckets[idx].loginErrors++
  }
  return buckets
}

function hourLabel(ms: number): string {
  return `${String(new Date(ms).getHours()).padStart(2, '0')} Uhr`
}
function minuteLabel(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Intraday: letzte 24 h (stündlich) und letzte Stunde (minütlich) + 24-h-Kennzahlen. */
export async function getIntraday(): Promise<Intraday> {
  if (isMock()) {
    const hourly = mockIntradayHourly()
    const minutely = mockIntradayMinutely()
    const logins = hourly.reduce((s, p) => s + p.logins, 0)
    const errors = hourly.reduce((s, p) => s + p.loginErrors, 0)
    return {
      hourly,
      minutely,
      metrics: { uniqueUsers: Math.round(logins * 0.72), activeClients: 3, logins, errors },
      mock: true,
    }
  }

  const now = Date.now()
  const hourMs = 60 * 60 * 1000
  // 24 volle Stunden-Buckets, ausgerichtet auf Stundengrenzen bis zur laufenden Stunde.
  const currentHourStart = new Date(now).setMinutes(0, 0, 0)
  const hourlyStart = currentHourStart - 23 * hourMs
  const events24 = await getEventsSince(hourlyStart)
  const hourly = bucketEvents(events24, hourlyStart, hourMs, 24, hourLabel)

  // 60 Minuten-Buckets bis zur laufenden Minute.
  const minuteMs = 60 * 1000
  const currentMinuteStart = new Date(now).setSeconds(0, 0)
  const minuteStart = currentMinuteStart - 59 * minuteMs
  const events1 = events24.filter((e) => Date.parse(e.time) >= minuteStart)
  const minutely = bucketEvents(events1, minuteStart, minuteMs, 60, minuteLabel)

  const loginEvents = events24.filter((e) => e.type === 'LOGIN')
  const metrics = {
    uniqueUsers: new Set(loginEvents.map((e) => e.username).filter(Boolean)).size,
    activeClients: new Set(events24.map((e) => e.clientId).filter(Boolean)).size,
    logins: loginEvents.length,
    errors: events24.length - loginEvents.length,
  }

  return { hourly, minutely, metrics, mock: false }
}

/** Fehlerliste eines Tages (Standard: heute) inkl. Aggregation + Auffälligkeiten. */
export async function getDayEvents(day = todayIso()): Promise<DayEvents> {
  const events = await getErrorEvents(day)

  const rows = events
    .slice()
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 100)
    .map((e) => ({
      time: new Date(e.time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      error: e.error ?? 'unbekannt',
      clientId: e.clientId ?? '—',
      username: e.username ?? '—',
    }))

  // Aggregation nach Fehlerart
  const counts = new Map<string, number>()
  for (const e of events) {
    const key = e.error ?? 'unbekannt'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const byType: ErrorTypeAgg[] = [...counts.entries()]
    .map(([error, count]) => ({ error, count, explanation: explainError(error) }))
    .sort((a, b) => b.count - a.count)

  // Auffälligkeit: ≥3 Fehlversuche mit identischem Benutzernamen ohne Konto
  const noAccount = new Map<string, { count: number; clientId?: string; ip?: string }>()
  for (const e of events) {
    if (e.error !== 'user_not_found' || !e.username) continue
    const cur = noAccount.get(e.username) ?? { count: 0, clientId: e.clientId, ip: e.ipAddress }
    cur.count++
    noAccount.set(e.username, cur)
  }
  const anomalies: Anomaly[] = [...noAccount.entries()]
    .filter(([, v]) => v.count >= 3)
    .map(([username, v]) => ({
      username,
      count: v.count,
      clientId: v.clientId,
      ipHint: v.ip,
    }))
    .sort((a, b) => b.count - a.count)

  return { day, rows, byType, anomalies, mock: isMock() }
}
