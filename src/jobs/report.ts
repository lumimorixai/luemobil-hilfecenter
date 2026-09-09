/**
 * CLI-Job für den automatischen Report-Versand (HTML-Mail + PDF-Anhang).
 * Ausführen: pnpm job:report <hour|day|week|month>
 *
 * Betrieb per System-Cron auf dem VPS, z. B.:
 *   0 * * * *   cd /pfad/app && pnpm job:report hour   >> /var/log/cockpit-report.log 2>&1
 *   30 6 * * *  cd /pfad/app && pnpm job:report day    >> /var/log/cockpit-report.log 2>&1
 *   30 6 * * 1  cd /pfad/app && pnpm job:report week   >> /var/log/cockpit-report.log 2>&1
 *   30 6 1 * *  cd /pfad/app && pnpm job:report month  >> /var/log/cockpit-report.log 2>&1
 * Versand geht an ALERT_EMAIL (wie die Störungs-Benachrichtigung).
 */
import { getPayload } from 'payload'
import config from '../payload.config'
import { sendReport } from '../lib/cockpit/reportSend'
import type { ReportPeriod } from '../lib/cockpit/report'

const PERIODS: ReportPeriod[] = ['hour', 'day', 'week', 'month']

async function run() {
  const period = (process.argv[2] || '').trim() as ReportPeriod
  if (!PERIODS.includes(period)) {
    console.error('Nutzung: pnpm job:report <hour|day|week|month>')
    process.exit(1)
  }
  const payload = await getPayload({ config })
  const r = await sendReport(payload, period)
  payload.logger.info(
    r.sent ? `Report ${period} versendet an ${r.to}.` : `Report ${period} NICHT versendet: ${r.reason}`,
  )
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
