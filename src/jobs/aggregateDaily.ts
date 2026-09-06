/**
 * CLI-Job für die Migrations-Zeitreihe. Aktualisiert den heutigen Tageswert
 * per Upsert und füllt fehlende Tage der letzten 14 Tage nach.
 *
 * Ausführen mit:  pnpm job:cockpit
 *
 * Betrieb: per System-Cron minütlich auf dem VPS auslösen, z. B.
 *   * * * * *  cd /pfad/zur/app && pnpm job:cockpit >> /var/log/cockpit-agg.log 2>&1
 * Dadurch bleibt „heute" nahezu in Echtzeit aktuell; die Tagesreihe wird
 * persistiert und übersteht die Keycloak-Event-Expiration.
 */
import { getPayload } from 'payload'
import config from '../payload.config'
import { aggregateToday, backfill } from '../lib/cockpit/aggregate'

async function run() {
  const payload = await getPayload({ config })
  const filled = await backfill(payload, 14)
  await aggregateToday(payload)
  payload.logger.info(
    `Cockpit-Aggregation: heute aktualisiert, ${filled} fehlende Tag(e) nachgefüllt.`,
  )
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
