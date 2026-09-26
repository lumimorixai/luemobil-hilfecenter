import { NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'
import { payloadClient } from '@/lib/content'
import { runHealthAlert } from '@/lib/cockpit/alert'
import { aggregateToday, backfill, backfillKonten } from '@/lib/cockpit/aggregate'
import { verdichteUndRaeumeAuf } from '@/lib/cockpit/retention'
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
 * Jobs:
 *   health              Monitoring + Störungs-Alert (jede Minute)
 *   aggregate           Tagesreihe fortschreiben (jede Minute); einmal je
 *                       Stunde zusätzlich Verfügbarkeit verdichten und alte
 *                       Minuten-Checks aufräumen
 *   konten              komplette Kontenhistorie ab dem ersten Konto (nachts)
 *   report&period=…     Bericht per Mail und PDF
 *
 * WICHTIG: Das Produktions-Image ist ein Standalone-Build (`node server.js`)
 * ohne pnpm, tsx und Quelltext — die CLI-Jobs aus src/jobs/ laufen dort NICHT.
 * Alles, was in Produktion regelmäßig oder einmalig laufen soll, muss hier
 * erreichbar sein.
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

        // Einmal je Stunde verdichten und aufräumen. Häufiger wäre Last ohne
        // Nutzen; ohne diesen Schritt wüchse health-checks unbegrenzt und die
        // Langfrist-Verfügbarkeit bliebe leer.
        let aufraeumen: { verdichtet: number; geloescht: number } | undefined
        if (new Date().getMinutes() === 7) {
          aufraeumen = await verdichteUndRaeumeAuf(payload)
        }
        return NextResponse.json({ ok: true, job, filled, aufraeumen })
      }
      case 'konten': {
        // Rekonstruiert die Kontenzahlen für jeden Tag seit dem ersten Konto.
        // Braucht keine Events und darf deshalb beliebig weit zurückreichen.
        const r = await backfillKonten(payload)
        return NextResponse.json({ ok: r.stimmt, job, ...r })
      }
      case 'report': {
        if (!period || !PERIODS.includes(period)) {
          return NextResponse.json({ error: 'bad_period' }, { status: 400 })
        }
        // PDF-Renderer (pdfkit/fontkit) nur bei Bedarf laden.
        const { sendReport } = await import('@/lib/cockpit/reportSend')
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
