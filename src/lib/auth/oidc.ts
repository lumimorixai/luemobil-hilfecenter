/**
 * Keycloak-Login per OpenID Connect (Authorization Code Flow + PKCE),
 * bewusst ohne zusätzliche Abhängigkeit — nur `fetch` und Node `crypto`.
 *
 * Ablauf:
 *   1. /api/auth/login  → Redirect zum Keycloak-Authorization-Endpoint
 *   2. Keycloak → /api/auth/callback?code=…  → Token-Tausch (Backchannel, TLS)
 *   3. ID-Token auslesen → Realm-Rollen → eigene Session (session.ts)
 *
 * Der ID-Token stammt aus einem direkten Server-zu-Server-Aufruf des
 * Token-Endpoints über TLS; seine Claims (u. a. realm_access.roles) werden
 * daraus gelesen. Nur im Node-Runtime verwenden.
 */
import { createHash, randomBytes } from 'node:crypto'
import { authRealm, keycloakUrl, oidcClientId, oidcClientSecret } from '../cockpit/config'

export type OidcEndpoints = {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  end_session_endpoint?: string
}

let cachedEndpoints: OidcEndpoints | null = null

export async function discover(): Promise<OidcEndpoints> {
  if (cachedEndpoints) return cachedEndpoints
  const url = `${keycloakUrl()}/realms/${authRealm()}/.well-known/openid-configuration`
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`OIDC-Discovery fehlgeschlagen (HTTP ${res.status})`)
  cachedEndpoints = (await res.json()) as OidcEndpoints
  return cachedEndpoints
}

export function redirectUri(): string {
  const base = (process.env.APP_BASE_URL || '').replace(/\/$/, '')
  return `${base}/api/auth/callback`
}

// --- PKCE + State ------------------------------------------------------------

export function createVerifier(): string {
  return randomBytes(32).toString('base64url')
}

export function challengeFromVerifier(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

export function createState(): string {
  return randomBytes(16).toString('base64url')
}

// --- Authorization-URL -------------------------------------------------------

export async function buildAuthUrl(state: string, codeChallenge: string): Promise<string> {
  const { authorization_endpoint } = await discover()
  const params = new URLSearchParams({
    client_id: oidcClientId(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid profile email',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${authorization_endpoint}?${params.toString()}`
}

// --- Token-Tausch ------------------------------------------------------------

type TokenResponse = { id_token?: string; access_token?: string }

export type OidcIdentity = {
  sub: string
  email: string
  name: string
  roles: string[]
}

export async function exchangeCode(code: string, codeVerifier: string): Promise<OidcIdentity> {
  const { token_endpoint } = await discover()
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    client_id: oidcClientId(),
    client_secret: oidcClientSecret(),
    code_verifier: codeVerifier,
  })
  const res = await fetch(token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Token-Tausch fehlgeschlagen (HTTP ${res.status})`)
  const tokens = (await res.json()) as TokenResponse
  if (!tokens.id_token) throw new Error('Token-Antwort ohne id_token')
  return identityFromTokens(tokens.id_token, tokens.access_token)
}

type JwtClaims = {
  sub?: string
  email?: string
  name?: string
  preferred_username?: string
  realm_access?: { roles?: string[] }
}

/** Dekodiert den Payload eines JWT (base64url). */
function decodeJwt(token: string): JwtClaims {
  const parts = token.split('.')
  if (parts.length < 2) throw new Error('Ungültiges Token')
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as JwtClaims
}

/**
 * Identität aus dem ID-Token, Realm-Rollen aus dem Access-Token.
 * (Keycloak legt realm_access.roles standardmäßig ins Access-Token, nicht ins
 * ID-Token — deshalb wird für die Rollen bevorzugt das Access-Token gelesen.)
 */
export function identityFromTokens(idToken: string, accessToken?: string): OidcIdentity {
  const id = decodeJwt(idToken)
  const access = accessToken ? decodeJwt(accessToken) : {}
  const roles = access.realm_access?.roles ?? id.realm_access?.roles ?? []
  return {
    sub: id.sub || '',
    email: id.email || id.preferred_username || '',
    name: id.name || id.preferred_username || id.email || 'Support',
    roles,
  }
}

export async function logoutUrl(): Promise<string | null> {
  const { end_session_endpoint } = await discover()
  if (!end_session_endpoint) return null
  const base = (process.env.APP_BASE_URL || '').replace(/\/$/, '')
  // Keycloak verlangt bei post_logout_redirect_uri zusätzlich client_id
  // (oder id_token_hint), sonst „Missing parameters: id_token_hint".
  const params = new URLSearchParams({
    post_logout_redirect_uri: base || '/',
    client_id: oidcClientId(),
  })
  return `${end_session_endpoint}?${params.toString()}`
}
