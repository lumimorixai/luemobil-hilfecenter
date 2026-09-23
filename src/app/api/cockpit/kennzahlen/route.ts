import { NextRequest, NextResponse } from 'next/server'
import { getCockpitSession } from '@/lib/auth/guard'
import { canSeeDashboard, dashboardEmbedUrl, dashboards, metabaseConfigured } from '@/lib/metabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Frische iframe-URL (neues Token) für ein Dashboard — für das automatische
 * Nachladen der Seite /kennzahlen. Gleiche Anmelde- und Rechteprüfung wie die
 * Seite; ohne Berechtigung wird KEIN Token erzeugt. Die URL wird nicht geloggt.
 */
export async function GET(req: NextRequest) {
  const session = await getCockpitSession()
  const key = (req.nextUrl.searchParams.get('dashboard') || '').toLowerCase()
  if (!session || !canSeeDashboard(session, key)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const dashboard = dashboards().find((d) => d.key === key)
  if (!dashboard) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!metabaseConfigured()) return NextResponse.json({ error: 'unconfigured' }, { status: 503 })

  const url = dashboardEmbedUrl(dashboard)
  if (!url) return NextResponse.json({ error: 'unconfigured' }, { status: 503 })
  return NextResponse.json({ url }, { headers: { 'Cache-Control': 'no-store' } })
}
