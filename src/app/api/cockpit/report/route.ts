import { NextResponse } from 'next/server'
import { requireSupport } from '@/lib/auth/guard'
import { payloadClient } from '@/lib/content'
import { sendReport } from '@/lib/cockpit/reportSend'
import type { ReportPeriod } from '@/lib/cockpit/report'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PERIODS: ReportPeriod[] = ['hour', 'day', 'week', 'month']

/** Manueller Report-Versand aus dem Cockpit — nur mit Support-Rolle. */
export async function POST(req: Request) {
  const session = await requireSupport()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let period: unknown
  try {
    period = (await req.json())?.period
  } catch {
    period = undefined
  }
  if (typeof period !== 'string' || !PERIODS.includes(period as ReportPeriod)) {
    return NextResponse.json({ error: 'bad_period' }, { status: 400 })
  }

  try {
    const payload = await payloadClient()
    const result = await sendReport(payload, period as ReportPeriod)
    if (!result.sent) {
      return NextResponse.json({ ok: false, reason: result.reason ?? 'nicht versendet' }, { status: 200 })
    }
    return NextResponse.json({ ok: true, to: result.to, period: result.period })
  } catch (err) {
    return NextResponse.json({ error: 'send_failed', detail: (err as Error).message }, { status: 502 })
  }
}
