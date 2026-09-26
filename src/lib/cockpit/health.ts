/**
 * Systemstatus für die Live-Ampel: Keycloak, App-Datenbank, Aboonline-Webservice
 * und ein synthetischer Login (Testuser, Ende-zu-Ende via Direct Access Grants).
 *
 * Die Checks laufen serverseitig on-demand (der Client pollt /api/cockpit/health).
 * Der teure Synthetik-Login wird 60 s gecacht → höchstens ein echter Login pro
 * Minute, egal wie viele Support-Leute zusehen.
 */
import { payloadClient } from '../content'
import {
  isMock,
  keycloakRealm,
  keycloakUrl,
  synthClientId,
  synthClientSecret,
  synthLoginRealm,
} from './config'
import { metabaseConfigured, metabaseUrl } from '../metabase'
import { getPatrisStatus } from './patris'
import { pingTicketApi } from './ticketApi'
import { reportingConfigured, reportingErreichbar } from '../reporting/db'
import type { Health, ServiceHealth } from './types'

/** Ab diesem Alter gilt der Patris-Upload als veraltet (Tage). */
const PATRIS_MAX_AGE_DAYS = Number(process.env.PATRIS_MAX_AGE_DAYS || 7)

const TIMEOUT = 8000

function ok(ms: number, note?: string): ServiceHealth {
  return { ok: true, ms, configured: true, note }
}
function fail(note: string, ms: number | null = null): ServiceHealth {
  return { ok: false, ms, configured: true, note }
}
const notConfigured: ServiceHealth = { ok: false, ms: null, configured: false, note: 'nicht konfiguriert' }

async function checkKeycloak(): Promise<ServiceHealth> {
  const start = Date.now()
  try {
    const res = await fetch(`${keycloakUrl()}/realms/${keycloakRealm()}/.well-known/openid-configuration`, {
      signal: AbortSignal.timeout(TIMEOUT),
    })
    const ms = Date.now() - start
    return res.ok ? ok(ms) : fail(`HTTP ${res.status}`, ms)
  } catch {
    return fail('nicht erreichbar', Date.now() - start)
  }
}

async function checkDatabase(): Promise<ServiceHealth> {
  const start = Date.now()
  try {
    const payload = await payloadClient()
    await payload.find({ collection: 'cockpit-daily', limit: 1, depth: 0, overrideAccess: true })
    return ok(Date.now() - start)
  } catch {
    return fail('Abfrage fehlgeschlagen', Date.now() - start)
  }
}

/**
 * Ergebnis für 60 s merken. Fremde Dienste sollen nicht mit jedem geöffneten
 * Cockpit-Tab (Ampel-Poll alle 30 s) erneut angefragt werden.
 */
const caches = new Map<string, { at: number; result: ServiceHealth }>()
async function gecacht(key: string, fn: () => Promise<ServiceHealth>): Promise<ServiceHealth> {
  const hit = caches.get(key)
  if (hit && Date.now() - hit.at < 60_000) return hit.result
  const result = await fn()
  caches.set(key, { at: Date.now(), result })
  return result
}

/** Ticket-API: antwortet der Dienst und wird der Token akzeptiert? */
async function checkTicketApi(): Promise<ServiceHealth> {
  const r = await pingTicketApi()
  if (r.note === 'nicht konfiguriert') return notConfigured
  return r.ok ? ok(r.ms ?? 0) : fail(r.note ?? 'nicht erreichbar', r.ms)
}

/** Metabase: öffentlicher Health-Endpunkt, ohne Anmeldung und ohne Daten. */
async function checkDashboards(): Promise<ServiceHealth> {
  if (!metabaseConfigured()) return notConfigured
  const start = Date.now()
  try {
    const res = await fetch(`${metabaseUrl()}/api/health`, { signal: AbortSignal.timeout(TIMEOUT) })
    const ms = Date.now() - start
    return res.ok ? ok(ms) : fail(`HTTP ${res.status}`, ms)
  } catch {
    return fail('nicht erreichbar', Date.now() - start)
  }
}

/**
 * Patris-Daten: keine Erreichbarkeit, sondern Aktualität. Der hochgeladene
 * Export ist die Quelle der Wahrheit im Kundencheck — veraltet er unbemerkt,
 * bekommen Kundinnen und Kunden falsche Auskünfte.
 */
async function checkPatris(): Promise<ServiceHealth> {
  try {
    const s = await getPatrisStatus()
    if (!s.importedAt || s.rowCount === 0) {
      return { ok: false, ms: null, configured: false, note: 'noch kein Upload' }
    }
    const tage = Math.floor((Date.now() - Date.parse(s.importedAt)) / (24 * 60 * 60 * 1000))
    const alter = tage === 0 ? 'heute hochgeladen' : `Upload ${tage} Tag${tage === 1 ? '' : 'e'} alt`
    // Keine Antwortzeit: hier zählt das Alter, nicht die Geschwindigkeit.
    return tage > PATRIS_MAX_AGE_DAYS
      ? fail(alter)
      : { ok: true, ms: null, configured: true, note: alter }
  } catch {
    return fail('Status nicht lesbar')
  }
}

/** Reporting-Datenbank: antwortet die Leseverbindung? */
async function checkReporting(): Promise<ServiceHealth> {
  if (!reportingConfigured()) return notConfigured
  const r = await reportingErreichbar()
  return r.ok ? ok(r.ms ?? 0) : fail('nicht erreichbar', r.ms)
}

// --- Synthetischer Login (ROPC, gecacht) ------------------------------------

let loginCache: { at: number; result: ServiceHealth } | null = null

async function checkLogin(): Promise<ServiceHealth> {
  const user = process.env.SYNTH_LOGIN_USER
  const pass = process.env.SYNTH_LOGIN_PASSWORD
  if (!user || !pass || !synthClientId()) return notConfigured

  const now = Date.now()
  if (loginCache && now - loginCache.at < 60_000) return loginCache.result

  const start = Date.now()
  let result: ServiceHealth
  try {
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: synthClientId(),
      username: user,
      password: pass,
      scope: 'openid',
    })
    if (synthClientSecret()) body.set('client_secret', synthClientSecret())
    const res = await fetch(`${keycloakUrl()}/realms/${synthLoginRealm()}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(TIMEOUT),
    })
    const ms = Date.now() - start
    result = res.ok ? ok(ms) : fail(`HTTP ${res.status}`, ms)
  } catch {
    result = fail('Login nicht möglich', Date.now() - start)
  }
  loginCache = { at: now, result }
  return result
}

export async function getHealth(): Promise<Health> {
  if (isMock()) {
    return {
      keycloak: ok(42),
      database: ok(6),
      login: ok(120),
      ticketApi: ok(180),
      dashboards: ok(95),
      patris: { ok: true, ms: null, configured: true, note: 'heute hochgeladen' },
      reporting: ok(35),
      mock: true,
    }
  }
  const [keycloak, database, login, ticketApi, dashboards, patris, reporting] = await Promise.all([
    checkKeycloak(),
    checkDatabase(),
    checkLogin(),
    gecacht('ticketApi', checkTicketApi),
    gecacht('dashboards', checkDashboards),
    checkPatris(),
    gecacht('reporting', checkReporting),
  ])

  // Test-Schalter: HEALTH_FORCE_FAIL=keycloak,login,database erzwingt Störungen
  // (nur für Alert-Tests; berührt keine echten Dienste).
  const forced = (process.env.HEALTH_FORCE_FAIL || '').split(',').map((s) => s.trim()).filter(Boolean)
  const forceFail = (s: ServiceHealth): ServiceHealth => ({
    ok: false,
    ms: s.ms,
    configured: true,
    note: 'Testmodus: erzwungene Störung',
  })

  return {
    keycloak: forced.includes('keycloak') ? forceFail(keycloak) : keycloak,
    database: forced.includes('database') ? forceFail(database) : database,
    login: forced.includes('login') ? forceFail(login) : login,
    ticketApi: forced.includes('ticketApi') ? forceFail(ticketApi) : ticketApi,
    dashboards: forced.includes('dashboards') ? forceFail(dashboards) : dashboards,
    patris: forced.includes('patris') ? forceFail(patris) : patris,
    reporting: forced.includes('reporting') ? forceFail(reporting) : reporting,
    mock: false,
  }
}
