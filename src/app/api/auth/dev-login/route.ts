import { NextRequest, NextResponse } from 'next/server'
import { isMock } from '@/lib/cockpit/config'
import { SESSION_COOKIE, encodeSession, sessionCookieOptions } from '@/lib/auth/session'

export const runtime = 'nodejs'

/**
 * Entwickler-Login: legt ohne echtes Keycloak eine Session mit Support-Rolle
 * an. NUR im Mock-Modus verfügbar — in Produktion strikt gesperrt.
 */
export async function GET(req: NextRequest) {
  if (!isMock()) {
    return new NextResponse('Nicht verfügbar.', { status: 404 })
  }

  const role = process.env.COCKPIT_SUPPORT_ROLE || 'support'
  const value = encodeSession({
    sub: 'mock-support',
    email: 'support@swl-innovation.de',
    name: 'Support (Mock)',
    roles: [role],
  })

  const nextRaw = req.cookies.get('oidc_next')?.value
  const target = nextRaw && nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/cockpit'

  const res = NextResponse.redirect(new URL(target, req.url))
  res.headers.set('Cache-Control', 'no-store')
  res.cookies.set(SESSION_COOKIE, value, sessionCookieOptions())
  res.cookies.delete('oidc_next')
  return res
}
