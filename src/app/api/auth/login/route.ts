import { NextRequest, NextResponse } from 'next/server'
import { isMock } from '@/lib/cockpit/config'
import { buildAuthUrl, challengeFromVerifier, createState, createVerifier } from '@/lib/auth/oidc'
import { cookieSecure } from '@/lib/auth/session'

export const runtime = 'nodejs'

/**
 * Startet den Login. Im Mock-Modus geht es direkt zum Dev-Login (kein echtes
 * Keycloak); sonst Redirect zum Keycloak-Authorization-Endpoint mit PKCE.
 */
/** Nur relative In-App-Pfade als Rücksprungziel zulassen (kein Open Redirect). */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
}

export async function GET(req: NextRequest) {
  const next = safeNext(req.nextUrl.searchParams.get('next'))

  if (isMock()) {
    const res = NextResponse.redirect(new URL('/api/auth/dev-login', req.url))
    res.headers.set('Cache-Control', 'no-store')
    res.cookies.set('oidc_next', next, {
      httpOnly: true,
      secure: cookieSecure(),
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    })
    return res
  }

  const state = createState()
  const verifier = createVerifier()
  const challenge = challengeFromVerifier(verifier)

  let authUrl: string
  try {
    authUrl = await buildAuthUrl(state, challenge)
  } catch {
    return new NextResponse('Anmeldedienst nicht erreichbar.', { status: 502 })
  }

  const res = NextResponse.redirect(authUrl)
  // Redirect nie cachen — sonst wird bei erneutem Aufruf kein frisches
  // state-/verifier-Cookie gesetzt und der Callback schlägt fehl.
  res.headers.set('Cache-Control', 'no-store')
  const opts = { httpOnly: true, secure: cookieSecure(), sameSite: 'lax' as const, path: '/', maxAge: 600 }
  res.cookies.set('oidc_state', state, opts)
  res.cookies.set('oidc_verifier', verifier, opts)
  res.cookies.set('oidc_next', next, opts)
  return res
}
