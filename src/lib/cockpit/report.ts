/**
 * Report-Datenschicht: bündelt die vorhandenen Cockpit-Auswertungen zu einer
 * periodengerechten Momentaufnahme (Stunde / Tag / Woche / Monat) für den
 * grafischen Versand (HTML-Mail-Body + PDF-Anhang). Robust: fällt eine Quelle
 * aus, bleibt der Rest bestehen (Promise.allSettled).
 */
import { getAvailability, getIntraday, getNewUsers, getOperations, getStats } from './stats'
import { keycloakRealm, isMock } from './config'
import { shortDe } from './date'

export type ReportPeriod = 'hour' | 'day' | 'week' | 'month'

export type SeriesPoint = { label: string; a: number; b: number }
export type Bar = { label: string; count: number }

export type ReportData = {
  period: ReportPeriod
  periodLabel: string
  rangeLabel: string
  generatedAt: string
  realm: string
  mock: boolean
  kpis: {
    logins: number
    errors: number
    errorRatePct: number
    newUsers: number
    totalUsers: number
  }
  loginSeries: SeriesPoint[]
  loginSeriesTitle: string
  newUsers: Bar[]
  newUsersTitle: string
  newUsersTotal: number
  support: { label: string; count: number }[]
  supportWindowLabel: string
  availability: { label: string; uptimePct: number; outages: number; configured: boolean }[]
}

const PERIOD_LABEL: Record<ReportPeriod, string> = {
  hour: 'Stunde',
  day: 'Tag',
  week: 'Woche',
  month: 'Monat',
}

const PERIOD_MS: Record<ReportPeriod, number> = {
  hour: 3600_000,
  day: 24 * 3600_000,
  week: 7 * 24 * 3600_000,
  month: 30 * 24 * 3600_000,
}

function fmt(ms: number, withTime: boolean): string {
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }
  return new Date(ms).toLocaleString('de-DE', opts)
}

function rangeLabel(period: ReportPeriod, now: number): string {
  const start = now - PERIOD_MS[period]
  if (period === 'hour' || period === 'day') {
    return `${fmt(start, true)} – ${fmt(now, true)} Uhr`
  }
  return `${fmt(start, false)} – ${fmt(now, false)}`
}

async function settled<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p
  } catch {
    return null
  }
}

export async function getReport(period: ReportPeriod): Promise<ReportData> {
  const now = Date.now()
  const [stats, intraday, newUsers, ops, avail] = await Promise.all([
    settled(getStats()),
    settled(getIntraday()),
    settled(getNewUsers()),
    settled(getOperations()),
    settled(getAvailability()),
  ])

  // Haupt-Zeitreihe (Logins vs. Fehler) passend zur Periode
  let loginSeries: SeriesPoint[] = []
  let loginSeriesTitle = 'Logins und Fehler'
  if (period === 'hour' && intraday) {
    loginSeries = intraday.minutely.map((p) => ({ label: p.label, a: p.logins, b: p.loginErrors }))
    loginSeriesTitle = 'Logins und Fehler je Minute (letzte Stunde)'
  } else if (period === 'day' && intraday) {
    loginSeries = intraday.hourly.map((p) => ({ label: p.label, a: p.logins, b: p.loginErrors }))
    loginSeriesTitle = 'Logins und Fehler je Stunde (letzte 24 Stunden)'
  } else if (stats) {
    // Die Reihe reicht ein Jahr zurück; der Report zeigt nur den Berichtszeitraum.
    const days = stats.series.slice(period === 'week' ? -7 : -30)
    loginSeries = days.map((p) => ({ label: shortDe(p.datum), a: p.logins, b: p.loginErrors }))
    loginSeriesTitle =
      period === 'week' ? 'Logins und Fehler je Tag (7 Tage)' : 'Logins und Fehler je Tag (30 Tage)'
  }

  // Neue Nutzer je Periode. Feiner als ein Tag gibt es die Zahl nicht mehr —
  // für „Stunde" und „Tag" steht deshalb der heutige Tageswert.
  const nuFenster = period === 'week' ? 'week' : period === 'month' ? 'month' : 'day'
  const nu = !newUsers ? [] : nuFenster === 'day' ? newUsers.week.slice(-1) : newUsers[nuFenster]
  const newUsersTotal = !newUsers
    ? 0
    : nuFenster === 'day'
      ? newUsers.totals.today
      : newUsers.totals[nuFenster]

  // KPIs: Logins/Fehler exakt aus der Perioden-Reihe summiert; Bestände als Snapshot
  const logins = loginSeries.reduce((s, p) => s + p.a, 0)
  const errors = loginSeries.reduce((s, p) => s + p.b, 0)
  const errorRatePct = logins + errors > 0 ? Math.round((errors / (logins + errors)) * 1000) / 10 : 0

  // Support-Kennzahlen (Tageswerte aus der eigenen Datenbank: heute)
  const s = ops?.support24h
  const support = s
    ? [
        { label: 'Passwort-Reset angefordert', count: s.passwordResetRequested },
        { label: 'Passwort-Reset abgeschlossen', count: s.passwordResetDone },
        { label: 'Passwort geändert', count: s.passwordChanged },
        { label: 'Verifizierungs-Mail gesendet', count: s.verifyEmailSent },
        { label: 'E-Mail bestätigt', count: s.verifyEmailDone },
        { label: 'Neuregistrierungen', count: s.registrations },
      ]
    : []

  const availability = avail
    ? avail.services.map((v) => ({
        label: v.label,
        uptimePct: v.uptimePct,
        outages: v.outages,
        configured: v.configured,
      }))
    : []

  return {
    period,
    periodLabel: PERIOD_LABEL[period],
    rangeLabel: rangeLabel(period, now),
    generatedAt: new Date(now).toLocaleString('de-DE'),
    realm: keycloakRealm(),
    mock: isMock(),
    kpis: {
      logins,
      errors,
      errorRatePct,
      newUsers: newUsersTotal,
      totalUsers: stats?.kpis.totalUsers ?? 0,
    },
    loginSeries,
    loginSeriesTitle,
    newUsers: nu,
    newUsersTitle:
      period === 'hour'
        ? 'Neue Konten je Minute (letzte Stunde)'
        : period === 'day'
          ? 'Neue Konten je Stunde (24 Stunden)'
          : period === 'week'
            ? 'Neue Konten je Tag (7 Tage)'
            : 'Neue Konten je Tag (30 Tage)',
    newUsersTotal,
    support,
    supportWindowLabel: 'letzte 24 Stunden',
    availability,
  }
}
