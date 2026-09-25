import { NextRequest, NextResponse } from 'next/server'
import { isMock } from '@/lib/cockpit/config'
import { SESSION_COOKIE, encodeSession, sessionCookieOptions } from '@/lib/auth/session'
import { cockpitRole, kundencheckRole, supportRole } from '@/lib/auth/guard'

export const runtime = 'nodejs'

/**
 * Entwickler-Login: legt ohne echtes Keycloak eine Session an. NUR im
 * Mock-Modus verfügbar — in Produktion strikt gesperrt.
 * ?as=kundencheck | cockpit | beide (Standard) — zum Testen der Rollentrennung.
 */
export async function GET(req: NextRequest) {
  // Doppelt gesichert: Mock-Modus UND niemals im Produktions-Build — sonst
  // öffnet ein versehentliches COCKPIT_MOCK=true eine Anmeldung ohne Passwort.
  if (process.env.NODE_ENV === 'production' || !isMock()) {
    return new NextResponse('Nicht verfügbar.', { status: 404 })
  }

  const as = req.nextUrl.searchParams.get('as')
  const role = as === 'kundencheck' ? kundencheckRole() : as === 'cockpit' ? cockpitRole() : supportRole()
  const value = encodeSession({
    sub: `mock-${role}`,
    email: 'support@swl-innovation.de',
    name: `Support (Mock, ${role})`,
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
