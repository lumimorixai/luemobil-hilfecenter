import { NextResponse } from 'next/server'
import { requireCockpit } from '@/lib/auth/guard'
import { getStats } from '@/lib/cockpit/stats'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** KPIs + Zeitreihen — nur mit Cockpit-Berechtigung (Rolle cockpit oder support). */
export async function GET() {
  const session = await requireCockpit()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  try {
    const stats = await getStats()
    return NextResponse.json(stats, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
  }
}
