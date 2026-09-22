import { NextRequest, NextResponse } from 'next/server'
import { requireCockpit } from '@/lib/auth/guard'
import { getDayEvents } from '@/lib/cockpit/stats'
import { todayIso } from '@/lib/cockpit/date'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

/** Fehlgeschlagene Anmeldungen eines Tages — nur mit Cockpit-Berechtigung (Rolle cockpit oder support). */
export async function GET(req: NextRequest) {
  const session = await requireCockpit()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const dayParam = req.nextUrl.searchParams.get('day')
  const day = dayParam && DAY_RE.test(dayParam) ? dayParam : todayIso()

  try {
    const events = await getDayEvents(day)
    return NextResponse.json(events, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 })
  }
}
