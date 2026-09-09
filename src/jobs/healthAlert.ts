/**
 * CLI-Job für Systemstatus-Monitoring + Störungs-Alerting.
 * Ausführen: pnpm job:health
 *
 * Betrieb: minütlich per System-Cron auf dem VPS, z. B.
 *   * * * * *  cd /pfad/zur/app && pnpm job:health >> /var/log/cockpit-health.log 2>&1
 * Prüft Keycloak, synthetischen Kunden-Login und Datenbank, erkennt
 * Zustandswechsel und mailt Störungen/Entwarnungen an ALERT_EMAIL.
 */
import { getPayload } from 'payload'
import config from '../payload.config'
import { runHealthAlert } from '../lib/cockpit/alert'

async function run() {
  const payload = await getPayload({ config })
  const { alerts } = await runHealthAlert(payload)
  payload.logger.info(`Health-Check geschrieben · ${alerts} Alert(s) versendet.`)
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
