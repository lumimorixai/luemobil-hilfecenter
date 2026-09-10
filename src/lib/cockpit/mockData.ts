/**
 * Mock-Datenschicht für die Entwicklung ohne echtes Keycloak/Aboonline.
 * Aktiv, solange COCKPIT_MOCK=true. Die Daten sind relativ zum aktuellen
 * Datum aufgebaut, damit „heute" und die 14-Tage-Zeitreihe immer aktuell wirken.
 *
 * Enthält die drei Demo-Kunden aus dem UI-Mockup, mit denen sich die
 * Abnahmekriterien 1–4 lokal durchspielen lassen:
 *   anna.albers@example.de   → in Keycloak migriert
 *   bernd.behn@example.de    → nicht migriert, aber Abo-Kunde
 *   carla.claas@example.de   → nirgends bekannt
 *   abo-down@example.de      → erzwingt einen Webservice-Störungszustand
 */
import type { AboResult, DailyPoint, KcEvent, KcUser } from './types'
import { isoDate } from './date'

const DAY_MS = 24 * 60 * 60 * 1000

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY_MS)
}

/** ISO-Zeitstempel für „heute HH:MM" (lokale Zeit). */
function todayAt(h: number, m: number): string {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

// --- Keycloak-Nutzer ---------------------------------------------------------

const MOCK_USERS: KcUser[] = [
  {
    id: 'kc-anna',
    email: 'anna.albers@example.de',
    kundennummer: '199801',
    createdAt: daysAgo(2).toISOString(),
  },
]

export function mockFindUser(email: string): KcUser | null {
  const e = email.trim().toLowerCase()
  return MOCK_USERS.find((u) => u.email.toLowerCase() === e) ?? null
}

/** Gesamtzahl aller Realm-Nutzer (migriert + lokal + registriert). */
export const MOCK_USER_COUNT = 1340
/** Davon migriert (föderiert). */
export const MOCK_MIGRATED_COUNT = 1284

// --- Aboonline ---------------------------------------------------------------

export function mockAbo(email: string): AboResult {
  const e = email.trim().toLowerCase()
  if (e === 'abo-down@example.de' || process.env.COCKPIT_MOCK_ABO_DOWN === 'true') {
    return { state: 'error', reason: 'Mock: Webservice nicht erreichbar (403)' }
  }
  if (e === 'anna.albers@example.de') {
    return { state: 'found', kundennummer: '199801', createdAt: '2019-04-12' }
  }
  if (e === 'bernd.behn@example.de') {
    return { state: 'found', kundennummer: '187334', createdAt: '2017-11-03' }
  }
  return { state: 'not_found' }
}

// --- Letzte Ereignisse je Kunde (Schritt 3 des Kundenchecks) -----------------

export function mockRecentUserEvents(email: string): KcEvent[] {
  const e = email.trim().toLowerCase()
  if (e === 'anna.albers@example.de') {
    return [
      { time: todayAt(18, 22), type: 'LOGIN', clientId: 'luemaas', username: e },
      { time: daysAgo(1).toISOString(), type: 'LOGIN', clientId: 'luemaas', username: e },
      { time: daysAgo(2).toISOString(), type: 'LOGIN', clientId: 'mpweb', username: e },
      { time: daysAgo(3).toISOString(), type: 'LOGIN_ERROR', error: 'invalid_user_credentials', clientId: 'luemaas', username: e },
      { time: daysAgo(3).toISOString(), type: 'LOGIN', clientId: 'luemaas', username: e },
      { time: daysAgo(6).toISOString(), type: 'LOGIN', clientId: 'luemaas', username: e },
    ]
  }
  if (e === 'carla.claas@example.de') {
    return [
      { time: todayAt(8, 47), type: 'LOGIN_ERROR', error: 'user_not_found', clientId: 'luemaas', username: e },
      { time: todayAt(8, 31), type: 'LOGIN_ERROR', error: 'user_not_found', clientId: 'luemaas', username: e },
    ]
  }
  return []
}

// --- Tageszahlen + Zeitreihe -------------------------------------------------

/**
 * Deterministische Tageszahlen für einen Tag (0 = heute, größer = älter).
 * Bildet eine sanft steigende Login-Kurve mit heute exakt den Mockup-Werten.
 */
type DayCounts = { logins: number; loginErrors: number; newUsers: number; registrations: number }

function dayCountsByOffset(offset: number): DayCounts {
  if (offset === 0) return { logins: 412, loginErrors: 23, newUsers: 37, registrations: 6 }
  const base = 400 - offset * 12
  const wobble = ((offset * 7) % 5) - 2
  const newUsers = 30 + ((offset * 5) % 8)
  return {
    logins: Math.max(180, base + wobble),
    loginErrors: 15 + ((offset * 3) % 9),
    newUsers,
    // Anteil Selbstregistrierungen ~15–25 % der neuen Nutzer.
    registrations: Math.max(1, Math.round(newUsers * 0.2) + ((offset * 2) % 3) - 1),
  }
}

export function mockDayCounts(dayIso: string): DayCounts {
  const offset = offsetForIso(dayIso)
  return dayCountsByOffset(offset < 0 ? 0 : offset)
}

/** Mock: Support-Kennzahlen, skaliert mit der Fensterlänge (Tage). */
export function mockSupportMetrics(fromMs: number, toMs: number) {
  const days = Math.max(1, Math.round((toMs - fromMs) / DAY_MS))
  return {
    passwordResetRequested: 12 * days,
    passwordResetDone: 8 * days,
    passwordChanged: 5 * days,
    verifyEmailSent: 20 * days,
    verifyEmailDone: 15 * days,
    registrations: 6 * days,
  }
}

/** Mock: Zeitstempel neu angelegter Nutzer seit `sinceMs` (dichter zu „heute"). */
export function mockUserCreationTimestamps(sinceMs: number): number[] {
  const now = Date.now()
  const out: number[] = []
  // Letzte 30 Tage, leicht steigende Tagesmenge.
  for (let d = 29; d >= 0; d--) {
    const dayStart = now - d * DAY_MS
    const perDay = 6 + ((30 - d) % 7)
    for (let i = 0; i < perDay; i++) {
      out.push(dayStart + Math.floor(((i + 0.5) / perDay) * DAY_MS))
    }
  }
  // Ein paar in der letzten Stunde für die Feinansicht.
  out.push(now - 6 * 60 * 1000, now - 22 * 60 * 1000, now - 47 * 60 * 1000)
  return out.filter((t) => t >= sinceMs && t <= now)
}

/** Mock: Logins je Client, skaliert mit der Fensterlänge (Tage). */
export function mockLoginsByClient(
  fromMs: number,
  toMs: number,
): { clientId: string; count: number; uniqueUsers: number }[] {
  const days = Math.max(1, Math.round((toMs - fromMs) / DAY_MS))
  return [
    { clientId: 'luemaas', count: 300 * days, uniqueUsers: Math.round(120 * Math.sqrt(days)) },
    { clientId: 'mpweb', count: 92 * days, uniqueUsers: Math.round(48 * Math.sqrt(days)) },
    { clientId: 'luemobil-web', count: 8 * days, uniqueUsers: Math.round(6 * Math.sqrt(days)) },
  ]
}

function offsetForIso(dayIso: string): number {
  const today = isoDate(new Date())
  for (let i = 0; i < 60; i++) {
    if (isoDate(daysAgo(i)) === dayIso) return i
    if (isoDate(daysAgo(i)) === today && i > 0) break
  }
  // Fallback über Differenz in Tagen
  const diff = Math.round((Date.parse(today) - Date.parse(dayIso)) / DAY_MS)
  return Number.isFinite(diff) ? diff : 0
}

/** Vollständige 14-Tage-Zeitreihe (aufsteigend nach Datum). */
export function mockSeries(days = 14): DailyPoint[] {
  const points: DailyPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const c = dayCountsByOffset(i)
    points.push({ datum: isoDate(daysAgo(i)), ...c })
  }
  return points
}

// --- Fehler-Events eines Tages (für die Fehlertabelle) -----------------------

/**
 * Erzeugt die LOGIN_ERROR-Events eines Tages. Für „heute" die aus dem Mockup
 * bekannte Mischung inklusive dreier „admin"-Fehlversuche (Auffälligkeit).
 */
export function mockErrorEvents(dayIso: string): KcEvent[] {
  const offset = offsetForIso(dayIso)
  if (offset === 0) {
    return [
      ev(9, 12, 'user_not_found', 'luemaas', 'igel.ingo@swl-innovation.de'),
      ev(9, 12, 'user_not_found', 'luemaas', 'igel.ingo@swl-innovation.de'),
      ev(8, 47, 'invalid_user_credentials', 'luemaas', 'meret.moews@example.de'),
      ev(8, 31, 'user_not_found', 'mpweb', 'mia.meise@swl-innovation.de'),
      ev(8, 47, 'user_not_found', 'luemaas', 'carla.claas@example.de'),
      ev(8, 31, 'user_not_found', 'luemaas', 'carla.claas@example.de'),
      ev(7, 58, 'invalid_user_credentials', 'luemaas', 'h.petersen@example.de'),
      ev(7, 41, 'user_not_found', 'luemaas', 'admin'),
      ev(7, 22, 'user_not_found', 'luemaas', 'admin'),
      ev(7, 11, 'user_not_found', 'luemaas', 'admin'),
      ev(6, 55, 'invalid_user_credentials', 'mpweb', 'k.krause@example.de'),
      ev(6, 30, 'expired_code', 'luemaas', 'l.lorenz@example.de'),
      ev(6, 12, 'expired_code', 'luemaas', 't.thiel@example.de'),
    ]
  }
  // Ältere Tage: kleinere, unauffällige Streuung.
  const counts = dayCountsByOffset(offset < 0 ? 0 : offset)
  const out: KcEvent[] = []
  const day = daysAgo(offset < 0 ? 0 : offset)
  for (let i = 0; i < Math.min(counts.loginErrors, 8); i++) {
    const d = new Date(day)
    d.setHours(7 + (i % 12), (i * 13) % 60, 0, 0)
    out.push({
      time: d.toISOString(),
      type: 'LOGIN_ERROR',
      error: i % 3 === 0 ? 'invalid_user_credentials' : 'user_not_found',
      clientId: i % 4 === 0 ? 'mpweb' : 'luemaas',
      username: `kunde${i}@example.de`,
    })
  }
  return out
}

function ev(h: number, m: number, error: string, clientId: string, username: string): KcEvent {
  return { time: todayAt(h, m), type: 'LOGIN_ERROR', error, clientId, username }
}

// --- Intraday (letzte 24 h stündlich, letzte Stunde minütlich) ---------------

type IntradayBucket = { label: string; logins: number; loginErrors: number }

/** 24 Stunden-Buckets mit tageszeitlicher Login-Kurve (Nacht niedrig, Tag hoch). */
export function mockIntradayHourly(): IntradayBucket[] {
  const now = new Date()
  const out: IntradayBucket[] = []
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 60 * 60 * 1000)
    const h = d.getHours()
    // Tageszeit-Gewicht: Peak am späten Nachmittag, nachts nahe 0.
    const w = Math.max(0.05, Math.sin(((h - 5) / 24) * Math.PI))
    out.push({
      label: `${String(h).padStart(2, '0')} Uhr`,
      logins: Math.round(6 + w * 30),
      loginErrors: Math.round((0.2 + w) * 1.6),
    })
  }
  return out
}

/** 60 Minuten-Buckets der letzten Stunde. */
export function mockIntradayMinutely(): IntradayBucket[] {
  const now = new Date()
  const out: IntradayBucket[] = []
  for (let i = 59; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 60 * 1000)
    out.push({
      label: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      logins: i % 4 === 0 ? 3 : i % 2 === 0 ? 2 : 1,
      loginErrors: i % 17 === 0 ? 1 : 0,
    })
  }
  return out
}
