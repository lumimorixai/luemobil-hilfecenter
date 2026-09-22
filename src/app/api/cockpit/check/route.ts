import { NextRequest, NextResponse } from 'next/server'
import { requireKundencheck } from '@/lib/auth/guard'
import { runCustomerCheck } from '@/lib/cockpit/diagnose'
import { rateLimit } from '@/lib/cockpit/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Kundencheck (User-Enumeration-Werkzeug) — nur mit Kundencheck-Berechtigung.
 * Rate-Limit 30/Minute je Session. Die abgefragte E-Mail wird NICHT
 * protokolliert (nur ein anonymer Zähler über das Rate-Limit).
 */
export async function GET(req: NextRequest) {
  const session = await requireKundencheck()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  if (!rateLimit(`check:${session.sub}`, 30, 60_000)) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Zu viele Abfragen. Bitte kurz warten.' },
      { status: 429 },
    )
  }

  const email = (req.nextUrl.searchParams.get('email') || '').trim().toLowerCase()
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }

  try {
    const diagnosis = await runCustomerCheck(email, session.email || session.name || session.sub)
    return NextResponse.json(diagnosis, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    // Bewusst ohne Details (keine Secrets/E-Mail in der Antwort).
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
  }
}
