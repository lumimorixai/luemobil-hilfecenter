import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Setzt einen noindex-Header, damit Suchmaschinen die Seite nicht in ihren
 * Index aufnehmen.
 *
 * - Während der Testphase (Umgebungsvariable SITE_NOINDEX=true) gilt das für die
 *   gesamte Seite.
 * - Das Admin-Panel (/admin) wird IMMER auf noindex gesetzt.
 *
 * Hinweis: noindex hält die Seite aus Suchergebnissen heraus, schützt aber nicht
 * vor Zugriff. Für eine geschlossene Testphase zusätzlich einen Passwortschutz
 * (Basic Auth) im Reverse Proxy einrichten — siehe Caddyfile.example.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next()
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
