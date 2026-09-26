/**
 * KPIs und Zeitreihen für die Cockpit-Startseite. Liest die persistierten
 * Tageswerte (Collection cockpit-daily) und ergänzt „heute" bei Bedarf live.
 * Im Mock-Modus wird eine vollständige 14-Tage-Serie erzeugt, damit die Demo
 * sofort aussagekräftig ist.
 */
import { payloadClient } from '../content'
import {
  getDayDetail,
  getErrorEvents,
  getEventsSince,
  usersCount,
} from '../keycloak'
import { isMock } from './config'
import { lastDays, shortDe, todayIso } from './date'
import { explainError } from './errors'
import { langfristUptime } from './retention'
import { mockIntradayHourly, mockIntradayMinutely, mockSeries } from './mockData'
import type {
  Anomaly,
  ClientLogin,
  Availability,
  AvailabilitySegment,
  AvailabilitySvc,
  CockpitStats,
  CountPoint,
  CronStatus,
  DailyPoint,
  DayEvents,
  ErrorTypeAgg,
  Intraday,
  IntradayPoint,
  KcEvent,
  NewUsers,
  Operations,
  SupportMetrics,
} from './types'

/**
 * Wie weit die Tagesreihe gelesen wird. Ein Tageswert kostet rund 100 Byte —
 * ein ganzes Jahr sind also etwa 40 KB. Die Reihe wird deshalb nie gelöscht;
 * die Ansicht blendet nur kürzere Ausschnitte ein.
 */
const SERIE_TAGE = 365

/**
 * So lange gilt ein gespeicherter Tageswert als frisch. Der Minuten-Job
 * schreibt jede Minute; drei Minuten Luft decken einen einzelnen Aussetzer ab,
 * ohne dass die Anzeige veraltet.
 */
const FRISCH_MS = 3 * 60 * 1000

/** Ab diesem Alter gilt ein Minuten-Job als stehengeblieben (Minuten). */
export const JOB_STILL_MIN = 5

async function readSeries(): Promise<DailyPoint[]> {
  const days = lastDays(SERIE_TAGE)
  const payload = await payloadClient()
  const found = await payload.find({
    collection: 'cockpit-daily',
    where: { datum: { in: days } },
    limit: SERIE_TAGE + 5,
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
      totalUsers: row?.totalUsers ?? undefined,
    }
  })

  // Mock: fehlt die Historie in der DB, komplette Demo-Serie verwenden.
  if (isMock() && found.docs.length < 3) {
    series = mockSeries(14)
  }

  /*
   * „Heute" live ergänzen, wenn der gespeicherte Wert nicht mehr frisch ist.
   *
   * Vorher wurde nur ergänzt, wenn der Datensatz ganz leer war. Setzte der
   * Minuten-Job aus, zeigte das Cockpit stillschweigend veraltete Zahlen —
   * genau so fehlten an einem Nachmittag 19 von 111 neuen Konten.
   */
  const today = todayIso()
  const todayRow = series[series.length - 1]
  const heuteDoc = byDate.get(today) as { updatedAt?: string } | undefined
  const alterMs = heuteDoc?.updatedAt ? Date.now() - Date.parse(heuteDoc.updatedAt) : Infinity
  if (todayRow?.datum === today && alterMs > FRISCH_MS) {
    try {
      const live = await getDayDetail(today)
      series[series.length - 1] = {
        ...todayRow,
        logins: live.logins,
        loginErrors: live.loginErrors,
        registrations: live.registrations,
      }
    } catch {
      // Live-Ergänzung ist optional; der gespeicherte Wert bleibt stehen.
    }
  }

  return series
}

export async function getStats(): Promise<CockpitStats> {
  const series = await readSeries()
  const today = series[series.length - 1]
  const yesterday = series[series.length - 2]

  /*
   * Kontenbestand und neue Konten kommen aus dem Zähler /users/count — eine
   * einzige, billige Abfrage. Der gespeicherte Tageswert dient nur als Rückfall,
   * denn er ist immer nur so frisch wie der letzte Lauf des Minuten-Jobs.
   * Die neuen Konten sind der Zuwachs gegenüber dem Bestand von gestern.
   */
  let newUsers24h = today?.newUsers ?? 0
  let totalUsers = today?.totalUsers ?? 0
  try {
    const jetzt = await usersCount()
    totalUsers = jetzt
    const bestandGestern = yesterday?.totalUsers
    if (bestandGestern != null) newUsers24h = Math.max(0, jetzt - bestandGestern)
  } catch {
    // Keycloak still: die gespeicherten Werte bleiben stehen.
  }

  const successfulLogins = today?.logins ?? 0
  const failedLogins = today?.loginErrors ?? 0
  const attempts = successfulLogins + failedLogins
  const errorRatePct = attempts > 0 ? Math.round((failedLogins / attempts) * 1000) / 10 : 0

  // Trend der erfolgreichen Logins ggü. Vortag (in Prozent).
  const prev = yesterday?.logins ?? 0
  const loginTrendPct =
    prev > 0 ? Math.round(((successfulLogins - prev) / prev) * 100) : null

  return {
    kpis: {
      successfulLogins,
      failedLogins,
      errorRatePct,
      newUsers24h,
      totalUsers,
    },
    series,
    loginTrendPct,
    mock: isMock(),
  }
}

// --- Betriebs-/Support-Kennzahlen -------------------------------------------

/** Support (24 h + 7 Tage) + Logins je Client (Live aus der Event-API). */
const LEERE_SUPPORT: SupportMetrics = {
  passwordResetRequested: 0,
  passwordResetDone: 0,
  passwordChanged: 0,
  verifyEmailSent: 0,
  verifyEmailDone: 0,
  registrations: 0,
}

/**
 * Support-Kennzahlen und Logins je Client — aus der Tagesreihe, nicht live.
 * Die Fenster sind dadurch Kalendertage („heute", „7 Tage") statt rollender
 * Stunden; dafür überleben die Zahlen das Verfallen der Keycloak-Events, und
 * der Seitenaufbau kostet keine drei Event-Abfragen mehr.
 */
export async function getOperations(): Promise<Operations> {
  const payload = await payloadClient()
  const tage = lastDays(7)
  const found = await payload.find({
    collection: 'cockpit-daily',
    where: { datum: { in: tage } },
    limit: 30,
    overrideAccess: true,
  })
  const byDate = new Map(found.docs.map((d) => [d.datum, d]))
  const heute = byDate.get(todayIso())

  const alsSupport = (roh: unknown): SupportMetrics => {
    const s = (roh ?? {}) as Partial<SupportMetrics>
    return {
      passwordResetRequested: s.passwordResetRequested ?? 0,
      passwordResetDone: s.passwordResetDone ?? 0,
      passwordChanged: s.passwordChanged ?? 0,
      verifyEmailSent: s.verifyEmailSent ?? 0,
      verifyEmailDone: s.verifyEmailDone ?? 0,
      registrations: s.registrations ?? 0,
    }
  }

  const support7d = tage.reduce<SupportMetrics>((summe, datum) => {
    const s = alsSupport(byDate.get(datum)?.support)
    return {
      passwordResetRequested: summe.passwordResetRequested + s.passwordResetRequested,
      passwordResetDone: summe.passwordResetDone + s.passwordResetDone,
      passwordChanged: summe.passwordChanged + s.passwordChanged,
      verifyEmailSent: summe.verifyEmailSent + s.verifyEmailSent,
      verifyEmailDone: summe.verifyEmailDone + s.verifyEmailDone,
      registrations: summe.registrations + s.registrations,
    }
  }, LEERE_SUPPORT)

  const rohClients = (heute?.loginsByClient ?? []) as ClientLogin[]
  const loginsByClient = Array.isArray(rohClients) ? rohClients : []

  return {
    support24h: alsSupport(heute?.support),
    support7d,
    loginsByClient,
    mock: isMock(),
  }
}

// --- Neue Nutzer (aus der eigenen Datenbank) --------------------------------

/** Neu angelegte Konten je Tag: 7- und 30-Tage-Reihe aus cockpit-daily. */
export async function getNewUsers(): Promise<NewUsers> {
  const payload = await payloadClient()
  const tage = lastDays(SERIE_TAGE)
  const found = await payload.find({
    collection: 'cockpit-daily',
    where: { datum: { in: tage } },
    limit: SERIE_TAGE + 5,
    overrideAccess: true,
  })
  const byDate = new Map(found.docs.map((d) => [d.datum, d]))

  const punkte: CountPoint[] = tage.map((datum) => ({
    label: shortDe(datum),
    count: byDate.get(datum)?.newUsers ?? 0,
  }))
  /*
   * Vor dem ersten aufgezeichneten Tag gibt es nichts zu zeigen. Ohne diesen
   * Schnitt begänne die Jahresansicht mit Monaten voller Nullen, die aussehen
   * wie „keine Anmeldungen" statt „noch nicht erfasst".
   */
  const ersterMitDaten = tage.findIndex((d) => byDate.has(d))
  const ab = (n: number) => {
    const von = Math.max(punkte.length - n, ersterMitDaten < 0 ? punkte.length - n : ersterMitDaten)
    return punkte.slice(Math.max(0, von))
  }
  const week = ab(7)
  const month = ab(30)
  const quarter = ab(90)
  const year = ersterMitDaten >= 0 ? punkte.slice(ersterMitDaten) : punkte
  const summe = (p: CountPoint[]) => p.reduce((n, x) => n + x.count, 0)
  const heuteRow = byDate.get(todayIso())

  // Wie in getStats: der heutige Punkt kommt vom Zähler, nicht aus dem
  // Tageswert — sonst hinkt er, sobald der Minuten-Job aussetzt.
  let bestand = heuteRow?.totalUsers ?? 0
  let heuteNeu = heuteRow?.newUsers ?? 0
  try {
    const jetzt = await usersCount()
    bestand = jetzt
    const gestern = byDate.get(tage[tage.length - 2])?.totalUsers
    if (gestern != null) heuteNeu = Math.max(0, jetzt - gestern)
  } catch {
    // Keycloak still: gespeicherte Werte bleiben.
  }
  if (punkte.length > 0) punkte[punkte.length - 1].count = heuteNeu

  return {
    week,
    month,
    quarter,
    year,
    totals: {
      today: heuteNeu,
      week: summe(week),
      month: summe(month),
      quarter: summe(quarter),
      year: summe(year),
    },
    totalUsers: bestand,
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

// ============================================================
// Verfügbarkeits-Historie (Statuspage-Streifen, letzte 24 h)
// ============================================================

const AVAIL_SEGMENTS = 48 // 24 h / 48 = je 30 Minuten pro Segment
const AVAIL_WINDOW_MS = 24 * 3600_000
const AVAIL_BUCKET_MIN = AVAIL_WINDOW_MS / AVAIL_SEGMENTS / 60_000
const AVAIL_DEFS: { key: AvailabilitySvc['key']; label: string }[] = [
  { key: 'keycloak', label: 'Keycloak' },
  { key: 'login', label: 'Login (Testkunde)' },
  { key: 'database', label: 'Datenbank' },
  { key: 'ticketApi', label: 'Ticket-API' },
  { key: 'dashboards', label: 'Dashboards' },
  { key: 'patris', label: 'Patris-Daten' },
  { key: 'reporting', label: 'Reporting' },
]

function hhmm(ms: number): string {
  return new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

/** Beschriftung „HH:MM–HH:MM Uhr" für ein Zeit-Segment. */
/** „25.09." — kurzes Datum, damit Segmente über Mitternacht unterscheidbar sind. */
function ddmm(ms: number): string {
  return new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

/** „25.09.2026, 14:07:12 Uhr" — vollständiger Zeitpunkt für Checks und Störungen. */
function zeitpunkt(ms: number): string {
  const d = new Date(ms)
  return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${d.toLocaleTimeString('de-DE')} Uhr`
}

function segLabel(from: number, to: number): string {
  return `${ddmm(from)}, ${hhmm(from)}–${hhmm(to)} Uhr`
}

/**
 * Liest die persistierten Health-Checks der letzten 24 h und verdichtet sie je
 * Dienst zu einem Verfügbarkeitsstreifen mit festem Zeitraster (je Segment
 * AVAIL_BUCKET_MIN Minuten). Ein Segment ist „down", sobald darin mindestens ein
 * Fehlversuch liegt, „none" ohne Messung. Zusätzlich: Uptime-%, Zahl der
 * Störfenster und Zeitpunkt der letzten Störung.
 */
export async function getAvailability(): Promise<Availability> {
  const nowMs = Date.now()
  const windowStart = nowMs - AVAIL_WINDOW_MS
  const bucketMs = AVAIL_WINDOW_MS / AVAIL_SEGMENTS

  type Sample = { t: number; ok: boolean; configured: boolean }
  // Roh-Messpunkte je Dienst einsammeln (Mock erzeugt, sonst aus health-checks).
  let perSvc: Record<string, Sample[]>
  let lastCheck: string | null

  if (isMock()) {
    // Alle 5 Minuten ein Check; je Serie deterministisch ein, zwei Störfenster.
    const stepMs = 5 * 60_000
    perSvc = Object.fromEntries(AVAIL_DEFS.map((d) => [d.key, [] as Sample[]]))
    for (let t = windowStart; t <= nowMs; t += stepMs) {
      const frac = (t - windowStart) / AVAIL_WINDOW_MS
      perSvc.keycloak.push({ t, ok: !(frac > 0.62 && frac < 0.65), configured: true })
      perSvc.login.push({ t, ok: !(frac > 0.3 && frac < 0.33), configured: true })
      perSvc.database.push({ t, ok: true, configured: true })
      perSvc.ticketApi.push({ t, ok: !(frac > 0.44 && frac < 0.46), configured: true })
      perSvc.dashboards.push({ t, ok: true, configured: true })
      perSvc.patris.push({ t, ok: true, configured: true })
      perSvc.reporting.push({ t, ok: true, configured: true })
    }
    lastCheck = zeitpunkt(nowMs)
  } else {
    const payload = await payloadClient()
    const found = await payload.find({
      collection: 'health-checks',
      where: { checkedAt: { greater_than: new Date(windowStart).toISOString() } },
      sort: 'checkedAt',
      limit: 5000,
      depth: 0,
      overrideAccess: true,
    })
    const docs = found.docs as unknown as {
      checkedAt: string
      status?: Record<string, { ok?: boolean; configured?: boolean }>
    }[]
    lastCheck = docs.length ? zeitpunkt(Date.parse(docs[docs.length - 1].checkedAt)) : null
    perSvc = Object.fromEntries(AVAIL_DEFS.map((d) => [d.key, [] as Sample[]]))
    for (const doc of docs) {
      const t = new Date(doc.checkedAt).getTime()
      for (const d of AVAIL_DEFS) {
        const s = doc.status?.[d.key]
        if (!s) continue
        perSvc[d.key].push({ t, ok: Boolean(s.ok), configured: s.configured !== false })
      }
    }
  }

  const services: AvailabilitySvc[] = AVAIL_DEFS.map((d) => {
    const all = perSvc[d.key] ?? []
    const configuredSamples = all.filter((s) => s.configured)
    const samples = configuredSamples.length
    const downSamples = configuredSamples.filter((s) => !s.ok).length
    const configured = samples > 0
    const uptimePct = configured ? Math.round(((samples - downSamples) / samples) * 1000) / 10 : 0
    const last = all.length ? all[all.length - 1] : null
    const current: 'ok' | 'down' | 'none' = !last || !last.configured ? 'none' : last.ok ? 'ok' : 'down'
    const lastDown = [...configuredSamples].reverse().find((s) => !s.ok)
    const lastOutage = lastDown ? zeitpunkt(lastDown.t) : null

    const segments: AvailabilitySegment[] = []
    let outages = 0
    for (let b = 0; b < AVAIL_SEGMENTS; b++) {
      const from = windowStart + b * bucketMs
      const to = from + bucketMs
      const inBucket = configuredSamples.filter((s) => s.t >= from && s.t < to)
      const dn = inBucket.filter((s) => !s.ok).length
      let state: AvailabilitySegment['state']
      if (inBucket.length === 0) state = 'none'
      else if (dn === 0) state = 'ok'
      else {
        state = 'down'
        outages++
      }
      const downMinutes = inBucket.length ? Math.round((dn / inBucket.length) * AVAIL_BUCKET_MIN) : 0
      segments.push({ state, label: segLabel(from, to), samples: inBucket.length, downSamples: dn, downMinutes })
    }

    return {
      key: d.key,
      label: d.label,
      current,
      configured,
      segments,
      samples,
      downSamples,
      outages,
      lastOutage,
      uptimePct,
    }
  })

  // Langfristwerte aus den verdichteten Tageswerten — überleben das Aufräumen
  // der Minuten-Checks.
  let langfrist: Availability['langfrist'] = null
  try {
    langfrist = await langfristUptime(await payloadClient(), 90)
  } catch {
    langfrist = null
  }

  return {
    windowLabel: `letzte 24 Stunden · ${ddmm(windowStart)}, ${hhmm(windowStart)} bis ${ddmm(nowMs)}, ${hhmm(nowMs)} Uhr`,
    bucketMinutes: AVAIL_BUCKET_MIN,
    services,
    lastCheck,
    langfrist,
    mock: isMock(),
  }
}

// --- Cron-/Job-Status --------------------------------------------------------

/**
 * Letzte Ausführungszeitpunkte der minütlichen Jobs, abgeleitet aus den Daten,
 * die sie hinterlassen: job=health schreibt health-checks (checkedAt),
 * job=aggregate aktualisiert cockpit-daily (updatedAt). Für die Fußzeile.
 */
export async function getCronStatus(): Promise<CronStatus> {
  const fmt = (v?: string | null) => (v ? zeitpunkt(Date.parse(v)) : null)
  const alter = (v?: string | null) =>
    v ? Math.round((Date.now() - Date.parse(v)) / 60000) : null
  try {
    const payload = await payloadClient()
    const [h, a] = await Promise.all([
      payload.find({ collection: 'health-checks', sort: '-checkedAt', limit: 1, depth: 0, overrideAccess: true }),
      payload.find({ collection: 'cockpit-daily', sort: '-updatedAt', limit: 1, depth: 0, overrideAccess: true }),
    ])
    const hDoc = h.docs[0] as unknown as { checkedAt?: string } | undefined
    const aDoc = a.docs[0] as unknown as { updatedAt?: string } | undefined
    return {
      lastHealth: fmt(hDoc?.checkedAt),
      lastAggregate: fmt(aDoc?.updatedAt),
      healthAlterMin: alter(hDoc?.checkedAt),
      aggregateAlterMin: alter(aDoc?.updatedAt),
    }
  } catch {
    return { lastHealth: null, lastAggregate: null, healthAlterMin: null, aggregateAlterMin: null }
  }
}
