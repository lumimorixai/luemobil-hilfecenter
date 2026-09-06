/**
 * Session für den geschützten Cockpit-Bereich: ein HMAC-signiertes Cookie,
 * das nach dem Keycloak-Login die Identität und die Realm-Rollen trägt.
 *
 * Bewusst ohne zusätzliche Abhängigkeit (Node `crypto`). Das Cookie ist
 * signiert (Integrität), nicht verschlüsselt — es enthält keine Secrets,
 * nur sub/email/name/roles. Verifiziert wird konstantzeitig.
 *
 * Nur im Node-Runtime verwenden (nicht in der Edge-Middleware).
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'cockpit_session'
/** Gültigkeitsdauer der Session in Sekunden (8 Stunden). */
export const SESSION_MAX_AGE = 8 * 60 * 60

export type CockpitSession = {
  sub: string
  email: string
  name: string
  roles: string[]
  /** Ablauf als Unix-Sekunden. */
  exp: number
}

function secret(): string {
  return process.env.SESSION_SECRET || process.env.PAYLOAD_SECRET || 'dev-secret-please-change'
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

function sign(payloadB64: string): string {
  return createHmac('sha256', secret()).update(payloadB64).digest('base64url')
}

/** Erzeugt den signierten Cookie-Wert aus einer Session (ohne exp → wird gesetzt). */
export function encodeSession(session: Omit<CockpitSession, 'exp'> & { exp?: number }): string {
  const full: CockpitSession = {
    ...session,
    exp: session.exp ?? Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  }
  const payloadB64 = b64url(JSON.stringify(full))
  return `${payloadB64}.${sign(payloadB64)}`
}

/** Prüft Signatur und Ablauf und gibt die Session zurück — oder null. */
export function decodeSession(value: string | undefined | null): CockpitSession | null {
  if (!value) return null
  const dot = value.indexOf('.')
  if (dot === -1) return null
  const payloadB64 = value.slice(0, dot)
  const sig = value.slice(dot + 1)

  const expected = sign(payloadB64)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const session = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as CockpitSession
    if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) return null
    if (!Array.isArray(session.roles)) return null
    return session
  } catch {
    return null
  }
}

export function hasRole(session: CockpitSession | null, role: string): boolean {
  return Boolean(session && session.roles.includes(role))
}

/**
 * Secure-Cookies nur, wenn die App tatsächlich über HTTPS ausgeliefert wird
 * (an APP_BASE_URL festgemacht). Lokaler Test läuft über http://localhost —
 * dort dürfen die Cookies NICHT Secure sein, sonst sendet der Browser sie nicht
 * zurück und der OIDC-Callback schlägt fehl.
 */
export function cookieSecure(): boolean {
  return (process.env.APP_BASE_URL || '').startsWith('https')
}

/** Standard-Optionen für das Session-Cookie. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  }
}
