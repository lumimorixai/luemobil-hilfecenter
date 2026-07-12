import { NextRequest, NextResponse } from 'next/server'
import https from 'node:https'

export const runtime = 'nodejs'

/**
 * Reverse-Proxy für die externe Störungsübersicht (enrico-peter.de/luebeck).
 *
 * Hintergrund: Die Quellseite hat ein ungültiges/selbstsigniertes Zertifikat.
 * In einem iframe kann der Browser eine Zertifikatswarnung nicht bestätigen —
 * die Einbettung bleibt leer. Dieser Proxy holt die Seite serverseitig über
 * das Node-eigene https-Modul, akzeptiert das Zertifikat NUR für diesen Host
 * und liefert den Inhalt unter unserer eigenen Origin aus.
 *
 * (Bewusst KEIN undici-Import: Next.js bündelt eine eigene, gepatchte
 *  undici-Version, mit der ein zweiter Import kollidiert.)
 *
 * Sicherheit: fest verdrahteter Zielhost (kein offener Proxy), nur GET,
 * Antwortgröße begrenzt, TLS-Prüfung nur für diesen einen Host deaktiviert.
 * Sauberer wäre ein gültiges Zertifikat auf der Quellseite (Let's Encrypt) —
 * dann kann dieser Proxy ersatzlos entfallen.
 */
const UPSTREAM_HOST = 'www.enrico-peter.de'
const PROXY_BASE = '/api/stoerungen-proxy'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const CACHE_SECONDS = 120
const MAX_REDIRECTS = 3

type Fetched = { status: number; contentType: string; body: Buffer }

function fetchUpstream(pathWithSearch: string, redirectsLeft = MAX_REDIRECTS): Promise<Fetched> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: UPSTREAM_HOST,
        path: pathWithSearch,
        method: 'GET',
        rejectUnauthorized: false, // nur für diesen Host: ungültiges Zertifikat akzeptieren
        headers: { 'User-Agent': 'LueMobil-Hilfecenter-Proxy/1.0', Accept: '*/*' },
        timeout: 10_000,
      },
      (res) => {
        const status = res.statusCode ?? 502
        const location = res.headers.location
        // Weiterleitungen innerhalb desselben Hosts folgen
        if (status >= 300 && status < 400 && location && redirectsLeft > 0) {
          res.resume()
          try {
            const next = new URL(location, `https://${UPSTREAM_HOST}${pathWithSearch}`)
            if (next.hostname.endsWith('enrico-peter.de')) {
              resolve(fetchUpstream(next.pathname + next.search, redirectsLeft - 1))
              return
            }
          } catch {
            /* ignore, unten normal weiter */
          }
        }
        const chunks: Buffer[] = []
        let total = 0
        res.on('data', (c: Buffer) => {
          total += c.length
          if (total > MAX_BYTES) {
            req.destroy()
            reject(new Error('Antwort der Quellseite zu groß.'))
            return
          }
          chunks.push(c)
        })
        res.on('end', () =>
          resolve({
            status,
            contentType: res.headers['content-type'] ?? 'application/octet-stream',
            body: Buffer.concat(chunks),
          }),
        )
      },
    )
    req.on('timeout', () => req.destroy(new Error('Zeitüberschreitung')))
    req.on('error', reject)
    req.end()
  })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await params
  const segments = path ?? ['luebeck']
  const pathWithSearch = '/' + segments.map(encodeURIComponent).join('/') + req.nextUrl.search

  try {
    const { status, contentType, body } = await fetchUpstream(pathWithSearch)

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, max-age=${CACHE_SECONDS}`,
      'X-Robots-Tag': 'noindex',
    }

    if (contentType.includes('text/html')) {
      let html = body.toString('utf8')
      html = html
        .replaceAll('https://www.enrico-peter.de', PROXY_BASE)
        .replaceAll('http://www.enrico-peter.de', PROXY_BASE)
        .replaceAll('https://enrico-peter.de', PROXY_BASE)
        .replaceAll('http://enrico-peter.de', PROXY_BASE)
        .replaceAll('//www.enrico-peter.de', PROXY_BASE)
      const baseHref = `${PROXY_BASE}/${segments.slice(0, -1).join('/')}${segments.length > 1 ? '/' : ''}`
      if (!/<base\s/i.test(html)) {
        html = html.replace(
          /<head([^>]*)>/i,
          `<head$1><base href="${baseHref || PROXY_BASE + '/'}">`,
        )
      }
      return new NextResponse(html, { status, headers })
    }

    return new NextResponse(body, { status, headers })
  } catch (err) {
    console.error('Störungs-Proxy: Quelle nicht erreichbar:', err)
    return new NextResponse(
      `<!doctype html><html lang="de"><body style="font-family:system-ui;padding:24px;color:#3F3B3B;">
        <p><strong>Die Störungsübersicht ist gerade nicht erreichbar.</strong></p>
        <p>Bitte versuchen Sie es in wenigen Minuten erneut oder öffnen Sie die Quelle direkt:
        <a href="https://${UPSTREAM_HOST}/luebeck">enrico-peter.de/luebeck</a></p>
      </body></html>`,
      { status: 502, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }
}
