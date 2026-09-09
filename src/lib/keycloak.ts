/**
 * Keycloak-Admin-API-Zugriff für das Migrations-Cockpit (nur lesend).
 *
 * Authentifizierung über den Service Account eines eigenen Confidential
 * Clients (grant_type=client_credentials) — NICHT über Admin-Benutzer/Passwort.
 * Der Service Account braucht nur die Client-Rollen `view-users` und
 * `view-events` von `realm-management`.
 *
 * Alle Zugangsdaten kommen aus Umgebungsvariablen (src/lib/cockpit/config.ts).
 * Solange COCKPIT_MOCK=true gesetzt ist, liefern alle Funktionen Mock-Daten.
 */
import { isMock, keycloakRealm, keycloakUrl } from './cockpit/config'
import type { KcEvent, KcUser } from './cockpit/types'
import { isoDate } from './cockpit/date'
import {
  MOCK_MIGRATED_COUNT,
  MOCK_USER_COUNT,
  mockDayCounts,
  mockErrorEvents,
  mockFindUser,
  mockLoginsByClient,
  mockRecentUserEvents,
  mockSupportMetrics,
  mockUserCreationTimestamps,
} from './cockpit/mockData'

const TIMEOUT_MS = 15_000

// --- Service-Account-Token (gecacht) ----------------------------------------

let cachedToken: { value: string; expiresAt: number } | null = null

async function getServiceToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now + 10_000) return cachedToken.value

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.COCKPIT_CLIENT_ID || '',
    client_secret: process.env.COCKPIT_CLIENT_SECRET || '',
  })
  const res = await fetch(
    `${keycloakUrl()}/realms/${keycloakRealm()}/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  )
  if (!res.ok) {
    // Bewusst OHNE Response-Body werfen — könnte sensible Details enthalten.
    throw new Error(`Keycloak-Token fehlgeschlagen (HTTP ${res.status})`)
  }
  const data = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = {
    value: data.access_token,
    expiresAt: now + (data.expires_in ?? 60) * 1000,
  }
  return cachedToken.value
}

async function adminFetch(path: string): Promise<Response> {
  const token = await getServiceToken()
  return fetch(`${keycloakUrl()}/admin/realms/${keycloakRealm()}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
}

// --- Nutzer ------------------------------------------------------------------

type KcRawUser = {
  id: string
  email?: string
  createdTimestamp?: number
  /** Verknüpfung zum User-Storage-Provider → gesetzt bei migrierten (föderierten) Usern. */
  federationLink?: string
  attributes?: Record<string, string[]>
}

function mapUser(u: KcRawUser): KcUser {
  return {
    id: u.id,
    email: u.email ?? '',
    kundennummer: u.attributes?.kundennummer?.[0] ?? u.attributes?.customerNumber?.[0],
    createdAt: u.createdTimestamp ? new Date(u.createdTimestamp).toISOString() : '',
  }
}

export async function findUserByEmail(email: string): Promise<KcUser | null> {
  if (isMock()) return mockFindUser(email)
  const res = await adminFetch(`/users?email=${encodeURIComponent(email)}&exact=true`)
  if (!res.ok) throw new Error(`Keycloak-Nutzersuche fehlgeschlagen (HTTP ${res.status})`)
  const users = (await res.json()) as KcRawUser[]
  const match = users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase())
  return match ? mapUser(match) : null
}

/** Gesamtzahl aller Realm-Nutzer (migriert + lokal + registriert). */
export async function usersCount(): Promise<number> {
  if (isMock()) return MOCK_USER_COUNT
  const res = await adminFetch(`/users/count`)
  if (!res.ok) throw new Error(`Keycloak-Nutzerzahl fehlgeschlagen (HTTP ${res.status})`)
  return (await res.json()) as number
}

/**
 * Zählt Nutzer über alle Seiten und filtert per Prädikat. Braucht die volle
 * Repräsentation (federationLink steht nicht in der Kurzform).
 * Hinweis: paginiert den gesamten Nutzerbestand — für sehr große Realms sollte
 * das perspektivisch der Tages-Job vorberechnen statt jeder Seitenaufruf.
 */
async function countUsers(pred: (u: KcRawUser) => boolean): Promise<number> {
  const PAGE = 100
  const MAX_PAGES = 500 // Sicherheitsnetz (~50.000 Nutzer)
  let first = 0
  let count = 0
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await adminFetch(`/users?first=${first}&max=${PAGE}&briefRepresentation=false`)
    if (!res.ok) throw new Error(`Keycloak-Nutzerliste fehlgeschlagen (HTTP ${res.status})`)
    const users = (await res.json()) as KcRawUser[]
    if (users.length === 0) break
    for (const u of users) if (pred(u)) count++
    first += users.length
    if (users.length < PAGE) break
  }
  return count
}

/** Anzahl migrierter (föderierter) Nutzer — federationLink gesetzt. */
export async function getMigratedCount(): Promise<number> {
  if (isMock()) return MOCK_MIGRATED_COUNT
  return countUsers((u) => Boolean(u.federationLink))
}

/**
 * Zeitstempel (ms) neu angelegter Nutzer seit `sinceMs`. Für den Neue-Nutzer-Graph.
 * Hinweis: paginiert den Nutzerbestand (kein Datumsfilter in der API) — für sehr
 * große Realms sollte das perspektivisch der Tages-Job vorberechnen.
 */
export async function getUserCreationTimestamps(sinceMs: number): Promise<number[]> {
  if (isMock()) return mockUserCreationTimestamps(sinceMs)
  const PAGE = 100
  const MAX_PAGES = 500
  const out: number[] = []
  let first = 0
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await adminFetch(`/users?first=${first}&max=${PAGE}&briefRepresentation=true`)
    if (!res.ok) throw new Error(`Keycloak-Nutzerliste fehlgeschlagen (HTTP ${res.status})`)
    const users = (await res.json()) as KcRawUser[]
    if (users.length === 0) break
    for (const u of users) {
      if (u.createdTimestamp && u.createdTimestamp >= sinceMs) out.push(u.createdTimestamp)
    }
    first += users.length
    if (users.length < PAGE) break
  }
  return out
}

// --- Events ------------------------------------------------------------------

type KcRawEvent = {
  time: number
  type: string
  error?: string
  clientId?: string
  userId?: string
  ipAddress?: string
  details?: { username?: string }
}

function mapEvent(e: KcRawEvent): KcEvent {
  return {
    time: new Date(e.time).toISOString(),
    type: e.type, // Rohtyp beibehalten (LOGIN, LOGIN_ERROR, REGISTER, RESET_PASSWORD …)
    error: e.error,
    clientId: e.clientId,
    username: e.details?.username,
    ipAddress: e.ipAddress,
  }
}

/** Rohe Events eines Zeitraums, optional auf Typen gefiltert, aufsteigend nach Zeit. */
async function fetchEvents(
  dateFrom: string,
  dateTo: string,
  types?: string[],
  max = 5000,
): Promise<KcEvent[]> {
  const params = new URLSearchParams()
  for (const t of types ?? []) params.append('type', t)
  params.set('dateFrom', dateFrom)
  params.set('dateTo', dateTo)
  params.set('max', String(max))
  const res = await adminFetch(`/events?${params.toString()}`)
  if (!res.ok) throw new Error(`Keycloak-Events fehlgeschlagen (HTTP ${res.status})`)
  const raw = (await res.json()) as KcRawEvent[]
  return raw.map(mapEvent).sort((a, b) => a.time.localeCompare(b.time))
}

const LOGIN_TYPES = ['LOGIN', 'LOGIN_ERROR']
const SUPPORT_TYPES = [
  'SEND_RESET_PASSWORD',
  'RESET_PASSWORD',
  'UPDATE_PASSWORD',
  'SEND_VERIFY_EMAIL',
  'VERIFY_EMAIL',
  'REGISTER',
]

/** Fehlgeschlagene Anmeldungen eines Tages (für die Fehlertabelle). */
export async function getErrorEvents(dayIso: string): Promise<KcEvent[]> {
  if (isMock()) return mockErrorEvents(dayIso)
  const to = isoDate(new Date(Date.parse(dayIso) + 24 * 60 * 60 * 1000))
  return fetchEvents(dayIso, to, ['LOGIN_ERROR'])
}

/** LOGIN/LOGIN_ERROR-Events seit einem Zeitpunkt (für Intraday-Reihen). */
export async function getEventsSince(sinceMs: number): Promise<KcEvent[]> {
  const from = isoDate(new Date(sinceMs))
  const to = isoDate(new Date(Date.now() + 24 * 60 * 60 * 1000))
  const events = await fetchEvents(from, to, LOGIN_TYPES)
  return events.filter((e) => Date.parse(e.time) >= sinceMs)
}

/** Letzte Login-Ereignisse zu einer E-Mail (Schritt 3 des Kundenchecks). */
export async function getRecentUserEvents(email: string, max = 5): Promise<KcEvent[]> {
  if (isMock()) return mockRecentUserEvents(email)
  const from = isoDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
  const to = isoDate(new Date(Date.now() + 24 * 60 * 60 * 1000))
  const events = await fetchEvents(from, to, LOGIN_TYPES)
  return events
    .filter((e) => (e.username ?? '').toLowerCase() === email.toLowerCase())
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, max)
}

/**
 * Tageszahlen für die Zeitreihe: Logins, Fehler, neu angelegte User (migriert +
 * registriert, über createdTimestamp) und davon Selbstregistrierungen (REGISTER).
 */
export async function getDayCounts(
  dayIso: string,
): Promise<{ logins: number; loginErrors: number; newUsers: number; registrations: number }> {
  if (isMock()) return mockDayCounts(dayIso)

  const dayStart = Date.parse(dayIso)
  const dayEnd = dayStart + 24 * 60 * 60 * 1000
  const to = isoDate(new Date(dayEnd))
  const events = await fetchEvents(dayIso, to, ['LOGIN', 'LOGIN_ERROR', 'REGISTER'])
  const logins = events.filter((e) => e.type === 'LOGIN').length
  const loginErrors = events.filter((e) => e.type === 'LOGIN_ERROR').length
  const registrations = events.filter((e) => e.type === 'REGISTER').length
  // „Neu migriert" = an diesem Tag angelegte FÖDERIERTE Nutzer (federationLink).
  const newUsers = await countUsers(
    (u) =>
      Boolean(u.federationLink) &&
      u.createdTimestamp != null &&
      u.createdTimestamp >= dayStart &&
      u.createdTimestamp < dayEnd,
  )
  return { logins, loginErrors, newUsers, registrations }
}

/** Support-Kennzahlen (Passwort-Resets, E-Mail-Verifizierung, Registrierung) im Fenster. */
export async function getSupportMetrics(fromMs: number, toMs: number) {
  if (isMock()) return mockSupportMetrics(fromMs, toMs)
  const from = isoDate(new Date(fromMs))
  const to = isoDate(new Date(toMs + 24 * 60 * 60 * 1000))
  const events = (await fetchEvents(from, to, SUPPORT_TYPES)).filter((e) => {
    const t = Date.parse(e.time)
    return t >= fromMs && t < toMs
  })
  const c = (type: string) => events.filter((e) => e.type === type).length
  return {
    passwordResetRequested: c('SEND_RESET_PASSWORD'),
    passwordResetDone: c('RESET_PASSWORD'),
    passwordChanged: c('UPDATE_PASSWORD'),
    verifyEmailSent: c('SEND_VERIFY_EMAIL'),
    verifyEmailDone: c('VERIFY_EMAIL'),
    registrations: c('REGISTER'),
  }
}

/** Erfolgreiche Logins je Client im Fenster (Betriebssicht). */
export async function getLoginsByClient(
  fromMs: number,
  toMs: number,
): Promise<{ clientId: string; count: number }[]> {
  if (isMock()) return mockLoginsByClient(fromMs, toMs)
  const from = isoDate(new Date(fromMs))
  const to = isoDate(new Date(toMs + 24 * 60 * 60 * 1000))
  const events = (await fetchEvents(from, to, ['LOGIN'])).filter((e) => {
    const t = Date.parse(e.time)
    return t >= fromMs && t < toMs
  })
  const byClient = new Map<string, number>()
  for (const e of events) {
    const id = e.clientId ?? '—'
    byClient.set(id, (byClient.get(id) ?? 0) + 1)
  }
  return [...byClient.entries()].map(([clientId, count]) => ({ clientId, count })).sort((a, b) => b.count - a.count)
}
