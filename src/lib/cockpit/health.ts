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
import type { Health, ServiceHealth } from './types'

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
      mock: true,
    }
  }
  const [keycloak, database, login] = await Promise.all([
    checkKeycloak(),
    checkDatabase(),
    checkLogin(),
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
    mock: false,
  }
}
