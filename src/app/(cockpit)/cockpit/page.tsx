import { redirect } from 'next/navigation'
import { getCockpitSession, isSupport } from '@/lib/auth/guard'
import { cockpitEnv, cockpitEnvLabel, keycloakRealm } from '@/lib/cockpit/config'
import { getDayEvents, getIntraday, getNewUsers, getOperations, getStats } from '@/lib/cockpit/stats'
import { shortDe } from '@/lib/cockpit/date'
import type {
  CockpitStats,
  DayEvents,
  Intraday,
  Keycloak24hMetrics,
  NewUsers,
  Operations,
} from '@/lib/cockpit/types'
import {
  ChartCard,
  CumulativeChart,
  DualLineChart,
  LoginsChart,
  NewUsersChart,
  Sparkline,
} from '@/components/cockpit/charts'
import { Kundencheck } from '@/components/cockpit/Kundencheck'
import { LiveStatus } from '@/components/cockpit/LiveStatus'

export const dynamic = 'force-dynamic'

function de(n: number): string {
  return n.toLocaleString('de-DE')
}

export default async function CockpitPage() {
  const session = await getCockpitSession()
  if (!session) redirect('/api/auth/login?next=/cockpit')
  if (!isSupport(session)) return <NoAccess />

  // Robust: Datenfehler dürfen den Kundencheck nicht mitreißen.
  let stats: CockpitStats | null = null
  let day: DayEvents | null = null
  let intraday: Intraday | null = null
  try {
    stats = await getStats()
  } catch {
    stats = null
  }
  try {
    intraday = await getIntraday()
  } catch {
    intraday = null
  }
  try {
    day = await getDayEvents()
  } catch {
    day = null
  }
  let ops: Operations | null = null
  try {
    ops = await getOperations()
  } catch {
    ops = null
  }
  let newUsers: NewUsers | null = null
  try {
    newUsers = await getNewUsers()
  } catch {
    newUsers = null
  }

  const stamp = new Date().toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <>
      <header className="cx-header">
        <div className="cx-header-in">
          <div className="cx-brand">
            LüMobil <span>Migrations-Cockpit</span>
          </div>
          <div className="cx-stamp">
            Realm {keycloakRealm()} · Stand {stamp} Uhr
          </div>
          <EnvBadge />
          <a className="cx-back" href="/">
            ← Zur Hilfe-Center-Seite
          </a>
          <a className="cx-logout" href="/api/auth/logout">
            Abmelden
          </a>
        </div>
        <div className="cx-header-in cx-header-status">
          <LiveStatus />
        </div>
      </header>

      <main className="cx-wrap">
        <Kundencheck />

        {/* KPI */}
        <h2 className="cx-h2">Letzte 24 Stunden</h2>
        {stats ? <KpiRow stats={stats} /> : <Unavailable />}

        {/* Keycloak-Kennzahlen: Nutzer & Aktivität */}
        <h2 className="cx-h2">
          Keycloak <span>· Nutzer &amp; Aktivität</span>
        </h2>
        {intraday && stats ? (
          <KeycloakStats
            totalMigrated={stats.kpis.totalMigrated}
            totalUsers={stats.kpis.totalUsers}
            m={intraday.metrics}
          />
        ) : (
          <Unavailable />
        )}

        {/* Neue Nutzer */}
        <h2 className="cx-h2">
          Neue Nutzer <span>· Stunde / 24 h / 7 Tage / 30 Tage</span>
        </h2>
        {newUsers ? (
          <ChartCard title="Neu angelegte Nutzer" hint="Neuzugänge je Zeitraum (Migration beim Erstlogin + Registrierung)">
            <NewUsersChart data={newUsers} />
          </ChartCard>
        ) : (
          <Unavailable />
        )}

        {/* Intraday-Verlauf */}
        <h2 className="cx-h2">
          Verlauf <span>· letzte 24 Stunden &amp; letzte Stunde</span>
        </h2>
        {intraday ? (
          <div className="cx-charts cx-charts--even">
            <ChartCard title="Letzte 24 Stunden" hint="Logins und Fehler je Stunde">
              <DualLineChart
                points={intraday.hourly.map((p) => ({ label: p.label, a: p.logins, b: p.loginErrors }))}
                maxTicks={7}
              />
            </ChartCard>
            <ChartCard title="Letzte Stunde" hint="Logins und Fehler je Minute">
              <DualLineChart
                points={intraday.minutely.map((p) => ({ label: p.label, a: p.logins, b: p.loginErrors }))}
                maxTicks={7}
              />
            </ChartCard>
          </div>
        ) : (
          <Unavailable />
        )}

        {/* Zeitreihen */}
        <h2 className="cx-h2">
          Zeitreihen <span>· 14 Tage</span>
        </h2>
        {stats ? (
          <div className="cx-charts">
            <ChartCard title="Logins und Fehler pro Tag" hint="Quelle: Keycloak-Events LOGIN und LOGIN_ERROR">
              <LoginsChart series={stats.series} />
            </ChartCard>
            <ChartCard
              title="Migrierte Kunden, kumuliert"
              hint="Föderierte (migrierte) Nutzer im Realm, kumuliert"
            >
              <CumulativeChart points={stats.cumulativeMigrated} />
            </ChartCard>
          </div>
        ) : (
          <Unavailable />
        )}

        {/* Migration vs. Registrierung */}
        <h2 className="cx-h2">
          Migration &amp; Registrierung <span>· 14 Tage</span>
        </h2>
        {stats ? (
          <div className="cx-charts">
            <ChartCard
              title="Migrationen vs. Neuregistrierungen"
              hint="Migriert = föderierte Neuzugänge · Neu registriert = REGISTER-Events"
            >
              <DualLineChart
                points={stats.migrationSeries.map((p) => ({
                  label: shortDe(p.datum),
                  a: p.migrated,
                  b: p.registered,
                }))}
                labelA="Migriert"
                labelB="Neu registriert"
                maxTicks={7}
              />
            </ChartCard>
            <div className="cx-card">
              <h3 className="cx-card-h">Heute</h3>
              <div className="cx-card-hint">Neuzugänge nach Herkunft</div>
              <div className="cx-minikpis">
                <div className="cx-mini">
                  <div className="cx-kpi-n">{de(stats.kpis.newMigrated)}</div>
                  <div className="cx-kpi-l">Migriert (Aboonline)</div>
                </div>
                <div className="cx-mini">
                  <div className="cx-kpi-n">{de(stats.newRegistered)}</div>
                  <div className="cx-kpi-l">Neu registriert</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Unavailable />
        )}

        {/* Support & Betrieb */}
        <h2 className="cx-h2">
          Support &amp; Betrieb <span>· letzte 24 Stunden</span>
        </h2>
        {ops ? <OpsSection ops={ops} /> : <Unavailable />}

        {/* Fehler */}
        <h2 className="cx-h2">
          Fehlgeschlagene Anmeldungen <span>· heute</span>
        </h2>
        {day ? <ErrorSection day={day} /> : <Unavailable />}

        <footer className="cx-footer">
          Datenquellen: Keycloak Admin API (Events, Users) und Aboonline-Webservice (AccountCheck).
          Zugriff nur für Support-Rollen; Kundencheck-Abfragen werden nicht protokolliert.
          {stats?.mock || day?.mock ? ' · Mock-Daten (Entwicklung)' : ''}
        </footer>
      </main>
    </>
  )
}

function EnvBadge() {
  return <span className={`cx-env cx-env--${cockpitEnv()}`}>{cockpitEnvLabel()}</span>
}

function NoAccess() {
  return (
    <main className="cx-wrap">
      <div className="cx-noaccess">
        <h1>Kein Zugriff</h1>
        <p>
          Für das Migrations-Cockpit ist die Rolle <code>support</code> erforderlich. Ihr Konto hat
          diese Rolle nicht.
        </p>
        <a className="cx-btn" href="/api/auth/logout">
          Abmelden
        </a>
      </div>
    </main>
  )
}

function Unavailable() {
  return <div className="cx-unavailable">Daten derzeit nicht verfügbar.</div>
}

function KpiRow({ stats }: { stats: CockpitStats }) {
  const k = stats.kpis
  const trend = stats.loginTrendPct
  const rate = k.errorRatePct.toLocaleString('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  return (
    <div className="cx-kpis">
      <div className="cx-kpi">
        <div className="cx-kpi-n">{de(k.successfulLogins)}</div>
        <div className="cx-kpi-l">Erfolgreiche Logins</div>
        {trend != null && (
          <div className={`cx-kpi-t ${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? '+' : ''}
            {trend} % ggü. Vortag
          </div>
        )}
        <Sparkline values={stats.series.map((p) => p.logins)} />
      </div>
      <div className="cx-kpi">
        <div className="cx-kpi-n">{de(k.failedLogins)}</div>
        <div className="cx-kpi-l">Fehlgeschlagene Logins</div>
        <div className="cx-kpi-t down">{rate} % Fehlerquote</div>
        <Sparkline values={stats.series.map((p) => p.loginErrors)} color="#000000" />
      </div>
      <div className="cx-kpi">
        <div className="cx-kpi-n">{de(k.newMigrated)}</div>
        <div className="cx-kpi-l">Neu migrierte Kunden</div>
        <div className="cx-kpi-t flat">gesamt {de(k.totalMigrated)}</div>
      </div>
      <div className="cx-kpi">
        <div className="cx-kpi-n">
          {k.progressPct}
          <em>%</em>
        </div>
        <div className="cx-kpi-l">Migrationsfortschritt</div>
        <div className="cx-bar" role="img" aria-label={`${k.progressPct} Prozent migriert`}>
          <i style={{ width: `${Math.min(100, k.progressPct)}%` }} />
        </div>
      </div>
    </div>
  )
}

function KeycloakStats({
  totalMigrated,
  totalUsers,
  m,
}: {
  totalMigrated: number
  totalUsers: number
  m: Keycloak24hMetrics
}) {
  return (
    <div className="cx-kpis">
      <div className="cx-kpi">
        <div className="cx-kpi-n">{de(totalMigrated)}</div>
        <div className="cx-kpi-l">Migriert (gesamt, föderiert)</div>
      </div>
      <div className="cx-kpi">
        <div className="cx-kpi-n">{de(totalUsers)}</div>
        <div className="cx-kpi-l">Nutzer gesamt (Realm)</div>
      </div>
      <div className="cx-kpi">
        <div className="cx-kpi-n">{de(m.uniqueUsers)}</div>
        <div className="cx-kpi-l">Eindeutige Nutzer (24 h)</div>
      </div>
      <div className="cx-kpi">
        <div className="cx-kpi-n">{de(m.activeClients)}</div>
        <div className="cx-kpi-l">Aktive Clients (24 h)</div>
      </div>
    </div>
  )
}

function OpsSection({ ops }: { ops: Operations }) {
  const s = ops.support24h
  const w = ops.support7d
  const tiles = [
    { n: s.passwordResetRequested, week: w.passwordResetRequested, l: 'Passwort-Reset angefordert' },
    { n: s.passwordResetDone, week: w.passwordResetDone, l: 'Passwort-Reset abgeschlossen' },
    { n: s.passwordChanged, week: w.passwordChanged, l: 'Passwort geändert' },
    { n: s.verifyEmailSent, week: w.verifyEmailSent, l: 'Verifizierungs-Mail gesendet' },
    { n: s.verifyEmailDone, week: w.verifyEmailDone, l: 'E-Mail bestätigt' },
    { n: s.registrations, week: w.registrations, l: 'Neuregistrierungen' },
  ]
  const maxClient = Math.max(1, ...ops.loginsByClient.map((c) => c.count))
  return (
    <div className="cx-split">
      <div className="cx-card">
        <h3 className="cx-card-h">Konto &amp; Passwort</h3>
        <div className="cx-card-hint">letzte 24 Stunden (darunter: 7 Tage)</div>
        <div className="cx-kpis cx-kpis--3">
          {tiles.map((t) => (
            <div className="cx-kpi" key={t.l}>
              <div className="cx-kpi-n">{de(t.n)}</div>
              <div className="cx-kpi-l">{t.l}</div>
              <div className="cx-kpi-t flat">7 Tage: {de(t.week)}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="cx-card">
          <h3 className="cx-card-h">Logins nach Client</h3>
          <div className="cx-card-hint">letzte 24 Stunden</div>
          {ops.loginsByClient.length === 0 ? (
            <div className="cx-empty">Keine Logins.</div>
          ) : (
            <ul className="cx-toplist">
              {ops.loginsByClient.map((c) => (
                <li key={c.clientId}>
                  <div className="cx-toplist-row">
                    <b>{c.clientId}</b>
                    <span>{de(c.count)}</span>
                  </div>
                  <div className="cx-bar">
                    <i style={{ width: `${Math.round((c.count / maxClient) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function ErrorSection({ day }: { day: DayEvents }) {
  return (
    <div className="cx-split">
      <div className="cx-card">
        {day.rows.length === 0 ? (
          <div className="cx-empty">Keine Fehler heute.</div>
        ) : (
          <table className="cx-table">
            <thead>
              <tr>
                <th>Zeit</th>
                <th>Fehler</th>
                <th>Client</th>
                <th>Benutzer</th>
              </tr>
            </thead>
            <tbody>
              {day.rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.time}</td>
                  <td>
                    <span className={`cx-pill ${r.error === 'invalid_user_credentials' ? 'amber' : 'red'}`}>
                      {r.error}
                    </span>
                  </td>
                  <td>{r.clientId}</td>
                  <td className="cx-mono">{r.username}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div>
        <div className="cx-card">
          <h3 className="cx-card-h">Fehlerarten heute</h3>
          {day.byType.length === 0 ? (
            <div className="cx-empty">Keine Fehler heute.</div>
          ) : (
            <ul className="cx-toplist">
              {day.byType.map((t) => (
                <li key={t.error}>
                  <div className="cx-toplist-row">
                    <b>{t.error}</b>
                    <span>{t.count}</span>
                  </div>
                  <div className="cx-toplist-exp">{t.explanation}</div>
                </li>
              ))}
            </ul>
          )}
          {day.anomalies.map((a) => (
            <div className="cx-sec" key={a.username}>
              <b>Auffällig</b>
              {a.count} Fehlversuche mit Benutzername „{a.username}"
              {a.clientId ? ` über den Client ${a.clientId}` : ''} – kein Treffer. Admin-Zugang ist
              abgeschottet.
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
