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
import { isMock, keycloakRealm, keycloakUrl, monitoringClientIds } from './cockpit/config'
import type { ClientLogin, KcEvent, KcUser, SupportMetrics } from './cockpit/types'
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
    userId: e.userId,
    username: e.details?.username,
    ipAddress: e.ipAddress,
  }
}

/** Rohe Events eines Zeitraums, optional auf Typen gefiltert, aufsteigend nach Zeit. */
/** Seitengröße der Event-Abfrage; Keycloak liefert höchstens diese Zahl je Anfrage. */
const EVENT_PAGE = 1000
/** Notbremse gegen Endlosschleifen bei sehr viel Verkehr. */
const EVENT_MAX_TOTAL = 100_000

/**
 * Events holen — seitenweise. Keycloak beantwortet eine Anfrage mit höchstens
 * `max` Ereignissen; ohne Blättern fehlten an verkehrsreichen Tagen die
 * ältesten, und die Tageswerte wären zu niedrig. `limit` begrenzt die Gesamtzahl
 * (für Abfragen, die ohnehin nur die jüngsten Ereignisse brauchen).
 */
async function fetchEvents(
  dateFrom: string,
  dateTo: string,
  types?: string[],
  limit = EVENT_MAX_TOTAL,
  userId?: string,
): Promise<KcEvent[]> {
  const raw: KcRawEvent[] = []
  for (let first = 0; raw.length < limit; first += EVENT_PAGE) {
    const params = new URLSearchParams()
    for (const t of types ?? []) params.append('type', t)
    if (userId) params.set('user', userId)
    params.set('dateFrom', dateFrom)
    params.set('dateTo', dateTo)
    params.set('first', String(first))
    params.set('max', String(Math.min(EVENT_PAGE, limit - raw.length)))
    const res = await adminFetch(`/events?${params.toString()}`)
    if (!res.ok) throw new Error(`Keycloak-Events fehlgeschlagen (HTTP ${res.status})`)
    const seite = (await res.json()) as KcRawEvent[]
    raw.push(...seite)
    if (seite.length < EVENT_PAGE) break
  }
  // Events des Cockpit-/Monitoring-Clients ausblenden (synthetischer Minuten-
  // Login), damit sie Logins/Fehler/Client-Statistik nicht verfälschen.
  const excluded = new Set(monitoringClientIds())
  return raw
    .map(mapEvent)
    .filter((e) => !e.clientId || !excluded.has(e.clientId))
    .sort((a, b) => a.time.localeCompare(b.time))
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

/**
 * Letzte Login-Ereignisse (14 Tage) zu einem Kunden (Kundencheck).
 * Mit User-ID filtert Keycloak serverseitig nach dem Konto — vollständig,
 * unabhängig vom übrigen Event-Aufkommen. Ohne Konto (userId leer) bleibt nur
 * der Abgleich über den eingegebenen Benutzernamen, z. B. für
 * `user_not_found`-Fehlversuche, die keine User-ID tragen.
 */
export async function getRecentUserEvents(
  email: string,
  userId?: string,
  max = 5,
): Promise<KcEvent[]> {
  if (isMock()) return mockRecentUserEvents(email)
  const from = isoDate(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
  const to = isoDate(new Date(Date.now() + 24 * 60 * 60 * 1000))
  const events = userId
    ? await fetchEvents(from, to, LOGIN_TYPES, max, userId)
    : // Ohne Konto bleibt nur der Abgleich über den Benutzernamen. Bewusst auf
      // die jüngsten 2.000 Ereignisse begrenzt: Der Kundencheck soll nicht die
      // gesamte Event-Historie durchblättern.
      (await fetchEvents(from, to, LOGIN_TYPES, 2000)).filter(
        (e) => (e.username ?? '').toLowerCase() === email.toLowerCase(),
      )
  return events.sort((a, b) => b.time.localeCompare(a.time)).slice(0, max)
}

/**
 * Konto-Anlagen je Tag — aus EINEM Durchgang durch die Nutzerliste.
 *
 * Maßgeblich ist `createdTimestamp`, nicht die REGISTER-Events: Nur der
 * Zeitstempel erklärt den Kontenbestand vollständig (die Summe aller Anlagen
 * entspricht exakt /users/count). Die Events weichen ab, weil sie auch
 * Versuche ohne entstandenes Konto zählen und an der UTC-Tagesgrenze schneiden.
 *
 * Ein Durchgang statt einer Abfrage je Tag: Für 14 Tage sind das rund 50 statt
 * 700 Anfragen an Keycloak.
 */
export async function getUserDayStats(): Promise<{
  /** Je Tag (JJJJ-MM-TT): alle Anlagen und davon aus dem Altsystem übernommene. */
  proTag: Map<string, { alle: number; migriert: number }>
  /** Konten insgesamt (Summe aller Anlagen). */
  gesamt: number
}> {
  const proTag = new Map<string, { alle: number; migriert: number }>()
  if (isMock()) {
    return { proTag, gesamt: MOCK_USER_COUNT }
  }

  let gesamt = 0
  const PAGE = 100
  const MAX_PAGES = 1000
  let first = 0
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await adminFetch(`/users?first=${first}&max=${PAGE}&briefRepresentation=false`)
    if (!res.ok) throw new Error(`Keycloak-Nutzerliste fehlgeschlagen (HTTP ${res.status})`)
    const users = (await res.json()) as KcRawUser[]
    if (users.length === 0) break
    for (const u of users) {
      gesamt++
      if (u.createdTimestamp == null) continue
      const iso = isoDate(new Date(u.createdTimestamp))
      const cur = proTag.get(iso) ?? { alle: 0, migriert: 0 }
      cur.alle++
      if (u.federationLink) cur.migriert++
      proTag.set(iso, cur)
    }
    first += users.length
    if (users.length < PAGE) break
  }
  return { proTag, gesamt }
}



/**
 * Alle Kennzahlen eines Tages aus EINEM Event-Durchgang: Anmeldungen, Support-
 * Ereignisse und Logins je Client. So fragt der Minuten-Job Keycloak einmal statt
 * dreimal — und die Werte landen in der Tagesreihe, überleben also das Verfallen
 * der Events.
 */
export async function getDayDetail(dayIso: string): Promise<{
  logins: number
  loginErrors: number
  registrations: number
  support: SupportMetrics
  loginsByClient: ClientLogin[]
}> {
  const dayStart = Date.parse(dayIso)
  const dayEnd = dayStart + 24 * 60 * 60 * 1000
  if (isMock()) {
    const m = await mockDayCounts(dayIso)
    return {
      logins: m.logins,
      loginErrors: m.loginErrors,
      registrations: m.registrations,
      support: await mockSupportMetrics(dayStart, dayEnd),
      loginsByClient: await mockLoginsByClient(dayStart, dayEnd),
    }
  }

  const events = await fetchEvents(dayIso, isoDate(new Date(dayEnd)), [
    ...LOGIN_TYPES,
    ...SUPPORT_TYPES,
  ])
  const c = (type: string) => events.filter((e) => e.type === type).length

  const byClient = new Map<string, { count: number; users: Set<string> }>()
  for (const e of events) {
    if (e.type !== 'LOGIN') continue
    const id = e.clientId ?? '—'
    const cur = byClient.get(id) ?? { count: 0, users: new Set<string>() }
    cur.count++
    const u = e.userId ?? e.username
    if (u) cur.users.add(u)
    byClient.set(id, cur)
  }

  return {
    logins: c('LOGIN'),
    loginErrors: c('LOGIN_ERROR'),
    registrations: c('REGISTER'),
    support: {
      passwordResetRequested: c('SEND_RESET_PASSWORD'),
      passwordResetDone: c('RESET_PASSWORD'),
      passwordChanged: c('UPDATE_PASSWORD'),
      verifyEmailSent: c('SEND_VERIFY_EMAIL'),
      verifyEmailDone: c('VERIFY_EMAIL'),
      registrations: c('REGISTER'),
    },
    loginsByClient: [...byClient.entries()]
      .map(([clientId, v]) => ({ clientId, count: v.count, uniqueUsers: v.users.size }))
      .sort((a, b) => b.count - a.count),
  }
}

