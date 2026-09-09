import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware für die gesamte Seite. Zwei Aufgaben:
 *
 * 1. Zugriffsschutz (Basic Auth) — TESTPHASE / geschlossener Betrieb.
 *    Wird über SITE_BASIC_AUTH=true aktiviert. Solange aktiv, verlangt die
 *    komplette Seite (inkl. /admin) Benutzername + Passwort aus
 *    SITE_BASIC_AUTH_USER / SITE_BASIC_AUTH_PASSWORD. Der Browser zeigt dafür
 *    seinen eigenen Login-Dialog; die Zugangsdaten werden pro Sitzung
 *    gemerkt. Zum Deaktivieren SITE_BASIC_AUTH entfernen oder auf false setzen.
 *
 *    Ausblick (2. Schritt): An genau dieser Stelle wird der Basic-Auth-Block
 *    später durch einen Keycloak/OIDC-Login ersetzt (Realm mit einzelnen
 *    Nutzenden statt gemeinsamem Passwort).
 *
 * 2. noindex-Header, damit Suchmaschinen die Seite nicht indexieren.
 *    - Testphase (SITE_NOINDEX=true): gilt für die gesamte Seite.
 *    - Das Admin-Panel (/admin) wird IMMER auf noindex gesetzt.
 */

/** Konstantzeit-Vergleich, damit die Prüfung nicht über die Antwortdauer verrät,
 *  wie viele Zeichen stimmen. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/** Prüft den Authorization-Header gegen die konfigurierten Zugangsdaten. */
function hasValidBasicAuth(req: NextRequest): boolean {
  const expectedUser = process.env.SITE_BASIC_AUTH_USER ?? ''
  const expectedPass = process.env.SITE_BASIC_AUTH_PASSWORD ?? ''
  // Ohne hinterlegtes Passwort würde der Schutz jeden durchlassen — dann lieber
  // konsequent sperren.
  if (!expectedPass) return false

  const header = req.headers.get('authorization')
  if (!header?.startsWith('Basic ')) return false

  let decoded: string
  try {
    decoded = atob(header.slice(6))
  } catch {
    return false
  }
  const sep = decoded.indexOf(':')
  if (sep === -1) return false
  const user = decoded.slice(0, sep)
  const pass = decoded.slice(sep + 1)

  return safeEqual(user, expectedUser) && safeEqual(pass, expectedPass)
}

/**
 * Interne Bereiche haben einen eigenen, stärkeren Schutz (Keycloak-OIDC +
 * Support-Rolle) und werden deshalb von der pauschalen Basic Auth ausgenommen —
 * sonst müssten Support-Mitarbeitende sich doppelt anmelden.
 */
function isInternalPath(pathname: string): boolean {
  return (
    pathname === '/cockpit' ||
    pathname.startsWith('/cockpit/') ||
    pathname === '/kundencheck' ||
    pathname.startsWith('/kundencheck/') ||
    pathname === '/ansprechpartner' ||
    pathname.startsWith('/ansprechpartner/') ||
    pathname.startsWith('/api/cockpit') ||
    pathname.startsWith('/api/auth')
  )
}

export function middleware(req: NextRequest) {
  // 1. Zugriffsschutz für die gesamte Seite (Testphase) — außer interne Bereiche.
  if (
    process.env.SITE_BASIC_AUTH === 'true' &&
    !isInternalPath(req.nextUrl.pathname) &&
    !hasValidBasicAuth(req)
  ) {
    return new NextResponse('Authentifizierung erforderlich.', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="LüMobil Hilfecenter", charset="UTF-8"',
        // Geschützte Seite nie zwischenspeichern lassen.
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
      },
    })
  }

  // 2. Aktuellen Pfad als Request-Header durchreichen (für den Keycloak-Gate-
  //    Rücksprung im Frontend-Layout).
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-pathname', req.nextUrl.pathname)

  // 3. noindex-Header.
  const res = NextResponse.next({ request: { headers: requestHeaders } })
  const noindexAll = process.env.SITE_NOINDEX === 'true'
  const isAdmin = req.nextUrl.pathname.startsWith('/admin')
  if (noindexAll || isAdmin) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  }
  return res
}

export const config = {
  // Auf allen Pfaden außer Next.js-internen Assets ausführen.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
