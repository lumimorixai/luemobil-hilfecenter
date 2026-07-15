import type { MetadataRoute } from 'next'

// Zur Laufzeit auswerten, damit SITE_NOINDEX ohne Neu-Build wirkt.
export const dynamic = 'force-dynamic'

/**
 * robots.txt — steuert das Verhalten von Suchmaschinen.
 * - Testphase (SITE_NOINDEX=true): komplette Seite gesperrt.
 * - Sonst: Seite erlaubt, nur das Admin-Panel gesperrt.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.SITE_NOINDEX === 'true') {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
  }
}
