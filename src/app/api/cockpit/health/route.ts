import { NextResponse } from 'next/server'
import { requireCockpit } from '@/lib/auth/guard'
import { getHealth } from '@/lib/cockpit/health'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Live-Systemstatus für die Ampel — nur mit Cockpit-Berechtigung (Rolle cockpit oder support). */
export async function GET() {
  const session = await requireCockpit()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  try {
    const health = await getHealth()
    return NextResponse.json(health, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
  }
}
