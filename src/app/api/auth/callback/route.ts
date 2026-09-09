import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode } from '@/lib/auth/oidc'
import { SESSION_COOKIE, encodeSession, sessionCookieOptions } from '@/lib/auth/session'

export const runtime = 'nodejs'

/**
 * Keycloak-Rücksprung: prüft state, tauscht den Code gegen Tokens, liest die
 * Realm-Rollen aus dem ID-Token und legt die eigene Session an.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookieState = req.cookies.get('oidc_state')?.value
  const verifier = req.cookies.get('oidc_verifier')?.value

  if (!code || !state || !cookieState || state !== cookieState || !verifier) {
    return new NextResponse('Ungültige oder abgelaufene Anmeldeantwort.', { status: 400 })
  }

  let identity
  try {
    identity = await exchangeCode(code, verifier)
  } catch {
    return new NextResponse('Anmeldung fehlgeschlagen.', { status: 502 })
  }

  const value = encodeSession({
    sub: identity.sub,
    email: identity.email,
    name: identity.name,
    roles: identity.roles,
  })

  // Rücksprung zur ursprünglich aufgerufenen Seite (nur relative Pfade).
  const nextRaw = req.cookies.get('oidc_next')?.value
  const target = nextRaw && nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/'

  // Basis an APP_BASE_URL festmachen — hinter dem Reverse-Proxy ist req.url die
  // interne Container-Adresse (0.0.0.0:3000); der Browser braucht die Domain.
  const base = (process.env.APP_BASE_URL || url.origin).replace(/\/$/, '')
  const res = NextResponse.redirect(new URL(target, base))
  res.headers.set('Cache-Control', 'no-store')
  res.cookies.set(SESSION_COOKIE, value, sessionCookieOptions())
  res.cookies.delete('oidc_state')
  res.cookies.delete('oidc_verifier')
  res.cookies.delete('oidc_next')
  return res
}
