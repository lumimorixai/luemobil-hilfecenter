/**
 * CLI-Job für die Migrations-Zeitreihe. Aktualisiert den heutigen Tageswert
 * per Upsert und füllt fehlende Tage der letzten 14 Tage nach.
 *
 * Ausführen mit:  pnpm job:cockpit
 * Komplette Kontenhistorie: pnpm job:cockpit konten — schreibt neue Konten und
 * Bestand für JEDEN Tag seit dem ersten angelegten Konto. Nötig einmalig und
 * nach Datenkorrekturen; braucht keine Events und reicht daher beliebig weit
 * zurück.
 *
 * Nachträglich befüllen: pnpm job:cockpit backfill [tage]  (Standard 14) —
 * berechnet die Tage des Fensters neu und leitet den Kontenbestand rückwärts
 * aus dem heutigen Zähler ab. Einmalig nach dem Einspielen dieser Version.
 *
 * Betrieb: per System-Cron minütlich auf dem VPS auslösen, z. B.
 *   * * * * *  cd /pfad/zur/app && pnpm job:cockpit >> /var/log/cockpit-agg.log 2>&1
 * Dadurch bleibt „heute" nahezu in Echtzeit aktuell; die Tagesreihe wird
 * persistiert und übersteht die Keycloak-Event-Expiration.
 */
import { getPayload } from 'payload'
import config from '../payload.config'
import { aggregateToday, backfill, backfillKonten } from '../lib/cockpit/aggregate'
import { verdichteUndRaeumeAuf } from '../lib/cockpit/retention'

async function run() {
  const [befehl, arg] = process.argv.slice(2)
  const payload = await getPayload({ config })

  if (befehl === 'backfill') {
    // Alle Tage des Fensters neu berechnen (exakt, dafür langsam) und den
    // Kontenbestand rückwärts fortschreiben. Für die Erstbefüllung und nach
    // Ausfällen des Minuten-Jobs.
    const tage = Number(arg) > 0 ? Number(arg) : 14
    const start = Date.now()
    const geschrieben = await backfill(payload, tage, { neuBerechnen: true })
    await aggregateToday(payload)
    const r = await verdichteUndRaeumeAuf(payload, { tage })
    payload.logger.info(
      `Cockpit-Backfill: ${geschrieben} von ${tage} Tag(en) neu berechnet, ` +
        `Kontenbestand aus den Anlagedaten abgeleitet, ${r.verdichtet} Tag(e) Verfügbarkeit verdichtet ` +
        `(${Math.round((Date.now() - start) / 1000)} s).`,
    )
    process.exit(0)
  }

  if (befehl === 'konten') {
    // Komplette Kontenhistorie ab dem ersten angelegten Konto. Anders als beim
    // Backfill sind hier keine Events nötig — das Anlagedatum genügt.
    const start = Date.now()
    const r = await backfillKonten(payload)
    payload.logger.info(
      `Kontenhistorie: ${r.tage} Tag(e) von ${r.von} bis ${r.bis} geschrieben, ` +
        `Bestand am Ende ${r.gesamt} (${Math.round((Date.now() - start) / 1000)} s).`,
    )
    if (!r.stimmt) {
      payload.logger.error(
        'Die Summe der Anlagen weicht vom Keycloak-Zähler ab — bitte prüfen.',
      )
      process.exit(1)
    }
    process.exit(0)
  }

  if (befehl) {
    console.error(`Unbekannter Befehl „${befehl}". Erlaubt: backfill [tage] | konten`)
    process.exit(1)
  }

  const filled = await backfill(payload, 14)
  await aggregateToday(payload)

  // Einmal je Stunde die Minuten-Checks verdichten und Altes aufräumen. Der Job
  // läuft minütlich; häufiger wäre reine Last ohne Nutzen.
  let aufraeumen = ''
  if (new Date().getMinutes() === 7) {
    const r = await verdichteUndRaeumeAuf(payload)
    aufraeumen = ` · Verfügbarkeit: ${r.verdichtet} Tag(e) verdichtet, ${r.geloescht} alte Messpunkte gelöscht`
  }

  payload.logger.info(
    `Cockpit-Aggregation: heute aktualisiert, ${filled} fehlende Tag(e) nachgefüllt.${aufraeumen}`,
  )
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
