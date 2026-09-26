/**
 * Überblick — der Einstieg ins Cockpit.
 *
 * Zeigt, was jetzt zu tun ist, die Leitkennzahl des Systemwechsels, den Betrieb
 * von heute und den Zustand der Dienste. Alles Weitere liegt in den Bereichen
 * der Seitenleiste.
 */
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { canCockpit, canKundencheck, getCockpitSession } from '@/lib/auth/guard'
import { cockpitEnv, cockpitEnvLabel, keycloakRealm } from '@/lib/cockpit/config'
import { JOB_STILL_MIN, getAvailability, getCronStatus, getStats } from '@/lib/cockpit/stats'
import { getPatrisStatus } from '@/lib/cockpit/patris'
import { getReporting } from '@/lib/reporting/kennzahlen'
import type { Availability, CockpitStats, CronStatus } from '@/lib/cockpit/types'
import type { Reporting } from '@/lib/reporting/types'
import { LiveStatus } from '@/components/cockpit/LiveStatus'
import {
  AnkommenSection,
  Karte,
  KpiRow,
  Seitenkopf,
  StatusKurz,
  Unavailable,
  de,
  euro,
} from '@/components/cockpit/bausteine'

export const dynamic = 'force-dynamic'

/** Tage seit einem Zeitpunkt, für die Warnung zum Patris-Upload. */
function tageSeit(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - Date.parse(iso)) / (24 * 60 * 60 * 1000))
}

export default async function UeberblickSeite() {
  const session = await getCockpitSession()
  if (!session) redirect('/api/auth/login?next=/cockpit')
  if (!canCockpit(session)) {
    if (canKundencheck(session)) redirect('/cockpit/kundencheck')
  }

  // Jede Quelle einzeln absichern: Ein stilles Reporting darf den Betrieb nicht
  // mitreißen, und ein Keycloak-Aussetzer nicht die Geschäftszahlen.
  let stats: CockpitStats | null = null
  try {
    stats = await getStats()
  } catch {
    stats = null
  }
  let availability: Availability | null = null
  try {
    availability = await getAvailability()
  } catch {
    availability = null
  }
  let reporting: Reporting = { verfuegbar: false, grund: 'nicht konfiguriert' }
  try {
    reporting = await getReporting()
  } catch {
    reporting = { verfuegbar: false, grund: 'nicht erreichbar' }
  }
  let cron: CronStatus | null = null
  try {
    cron = await getCronStatus()
  } catch {
    cron = null
  }
  let patrisAlter: number | null = null
  try {
    patrisAlter = tageSeit((await getPatrisStatus()).importedAt)
  } catch {
    patrisAlter = null
  }

  const maxAlter = Number(process.env.PATRIS_MAX_AGE_DAYS || 7)
  const patrisVeraltet = patrisAlter != null && patrisAlter > maxAlter
  // Steht der Minuten-Job, veralten die Tageswerte still. Das gehört sichtbar
  // gemacht — Bestand und neue Konten holt die Seite zwar live nach, Logins und
  // Support-Zahlen aber nicht.
  const jobSteht = cron?.aggregateAlterMin != null && cron.aggregateAlterMin > JOB_STILL_MIN

  return (
    <>
      <Seitenkopf
        titel="Überblick"
        unterzeile={`Realm ${keycloakRealm()} · jede Zahl mit Quelle und Zeitraum`}
      >
        <span className={`cx-env cx-env--${cockpitEnv()}`}>{cockpitEnvLabel()}</span>
        <LiveStatus />
      </Seitenkopf>

      {patrisVeraltet && (
        <div className="cx-glas cx-tun cx-tun--warn">
          <span className="cx-punkt cx-punkt--no" />
          <div style={{ flexGrow: 1 }}>
            <div className="cx-tun-titel">
              Patris-Export ist {patrisAlter} Tage alt
            </div>
            <div className="cx-tun-text">
              Der Kundencheck beantwortet Ticketfragen damit möglicherweise falsch.
            </div>
          </div>
          <Link href="/cockpit/daten" className="cx-knopf cx-knopf--akzent">
            Neue Datei laden
          </Link>
        </div>
      )}

      {jobSteht && (
        <div className="cx-glas cx-tun cx-tun--warn">
          <span className="cx-punkt cx-punkt--warn" />
          <div style={{ flexGrow: 1 }}>
            <div className="cx-tun-titel">
              Die Tageswerte sind {cron?.aggregateAlterMin} Minuten alt
            </div>
            <div className="cx-tun-text">
              Der Minuten-Job schreibt gerade nicht. Kontenbestand und neue Konten stehen trotzdem
              aktuell hier — Anmeldungen und Support-Zahlen können hinterherhinken.
            </div>
          </div>
          <Link href="/cockpit/daten" className="cx-knopf">
            Job-Läufe ansehen
          </Link>
        </div>
      )}

      <h2 className="cx-h2">
        Ankommen im neuen System <span>· Reporting, nachts aktualisiert</span>
        <Link href="/cockpit/ankommen" style={{ marginLeft: 'auto', fontSize: 13 }}>
          Alle Zahlen zur Aktivierung →
        </Link>
      </h2>
      <AnkommenSection data={reporting} kurz />

      <h2 className="cx-h2">
        Betrieb heute <span>· eigene Datenbank, minütlich</span>
        <Link href="/cockpit/anmeldungen" style={{ marginLeft: 'auto', fontSize: 13 }}>
          Anmeldungen im Detail →
        </Link>
      </h2>
      {stats ? <KpiRow stats={stats} /> : <Unavailable />}

      <div className="cx-split">
        <Karte titel="Tickets und Umsatz" quelle="Reporting · seit Start">
          {reporting.verfuegbar ? (
            <>
              <div className="cx-raster cx-raster--2" style={{ gap: 24 }}>
                <div>
                  <div className="cx-zahl">{euro(reporting.verkauf.umsatzBrutto)}</div>
                  <div className="cx-label">Umsatz brutto</div>
                </div>
                <div>
                  <div className="cx-zahl">{de(reporting.verkauf.verkaeufe)}</div>
                  <div className="cx-label">Verkäufe</div>
                </div>
                <div>
                  <div className="cx-zahl">{de(reporting.verkauf.erfolgPct)} %</div>
                  <div className="cx-label">Erfolgreich ausgeliefert</div>
                </div>
                <div>
                  <div className="cx-zahl">{de(reporting.verkauf.abbrueche)}</div>
                  <div className="cx-label">Abgebrochene Bestellungen</div>
                </div>
              </div>
              <div style={{ marginTop: 18 }}>
                <Link href="/cockpit/umsatz" style={{ fontSize: 13 }}>
                  Verlauf und Produkte →
                </Link>
              </div>
            </>
          ) : (
            <div className="cx-empty">
              Die Reporting-Datenbank ist nicht angebunden. Siehe docs/REPORTING.md.
            </div>
          )}
        </Karte>

        <Karte titel="Systeme" quelle="24 Stunden">
          {availability ? (
            <>
              <StatusKurz data={availability} />
              <div style={{ marginTop: 18 }}>
                <Link href="/cockpit/verfuegbarkeit" style={{ fontSize: 13 }}>
                  Verfügbarkeit im Detail →
                </Link>
              </div>
            </>
          ) : (
            <Unavailable />
          )}
        </Karte>
      </div>

      <footer className="cx-footer">
        Quellen: Keycloak (live), eigene Datenbank (minütlich), Reporting (nachts) und der
        hochgeladene Patris-Export. Kundencheck-Abfragen werden nicht protokolliert.
        {stats?.mock ? ' · Mock-Daten (Entwicklung)' : ''}
      </footer>
    </>
  )
}
