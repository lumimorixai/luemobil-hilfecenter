import { NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'
import { payloadClient } from '@/lib/content'
import { runHealthAlert } from '@/lib/cockpit/alert'
import { sendReport } from '@/lib/cockpit/reportSend'
import { aggregateToday, backfill } from '@/lib/cockpit/aggregate'
import type { ReportPeriod } from '@/lib/cockpit/report'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PERIODS: ReportPeriod[] = ['hour', 'day', 'week', 'month']

/** Zeitkonstanter Secret-Vergleich (über SHA-256, damit Längen gleich sind). */
function secretOk(provided: string | null): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected || !provided) return false
  const a = createHash('sha256').update(provided).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

function readSecret(req: Request): string | null {
  const header = req.headers.get('x-cron-secret')
  if (header) return header
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return null
}

/**
 * HTTP-getriggerte Cron-Jobs für die Produktivumgebung (Standalone-Image kann
 * keine tsx-CLI-Jobs ausführen). Aufruf durch den Host-Cron per curl, z. B.:
 *   curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" \
 *     "https://…/api/cockpit/cron?job=health"
 * Jobs: health (Monitoring+Alert), aggregate (Tagesreihe), report&period=…
 */
export async function POST(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'cron_disabled' }, { status: 503 })
  }
  if (!secretOk(readSecret(req))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 401 })
  }

  const url = new URL(req.url)
  const job = url.searchParams.get('job')
  const period = url.searchParams.get('period') as ReportPeriod | null

  try {
    const payload = await payloadClient()
    switch (job) {
      case 'health': {
        const { alerts } = await runHealthAlert(payload)
        return NextResponse.json({ ok: true, job, alerts })
      }
      case 'aggregate': {
        const filled = await backfill(payload, 14)
        await aggregateToday(payload)
        return NextResponse.json({ ok: true, job, filled })
      }
      case 'report': {
        if (!period || !PERIODS.includes(period)) {
          return NextResponse.json({ error: 'bad_period' }, { status: 400 })
        }
        const result = await sendReport(payload, period)
        return NextResponse.json({ ok: result.sent, job, period, to: result.to, reason: result.reason })
      }
      default:
        return NextResponse.json({ error: 'bad_job' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: 'job_failed', detail: (err as Error).message }, { status: 502 })
  }
}
