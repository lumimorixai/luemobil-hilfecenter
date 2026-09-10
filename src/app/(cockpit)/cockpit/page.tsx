import { redirect } from 'next/navigation'
import { getCockpitSession, isSupport } from '@/lib/auth/guard'
import { cockpitEnv, cockpitEnvLabel, keycloakRealm } from '@/lib/cockpit/config'
import {
  getAvailability,
  getCronStatus,
  getDayEvents,
  getIntraday,
  getNewUsers,
  getOperations,
  getStats,
} from '@/lib/cockpit/stats'
import type {
  Availability,
  CockpitStats,
  DayEvents,
  Intraday,
  Keycloak24hMetrics,
  NewUsers,
  Operations,
} from '@/lib/cockpit/types'
import {
  ChartCard,
  DualLineChart,
  LoginsRangeChart,
  NewUsersChart,
  Sparkline,
} from '@/components/cockpit/charts'
import { AvailabilityStrip } from '@/components/cockpit/Availability'
import { Kundencheck } from '@/components/cockpit/Kundencheck'
import { LiveStatus } from '@/components/cockpit/LiveStatus'
import { ReportButtons } from '@/components/cockpit/ReportButtons'

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
  let availability: Availability | null = null
  try {
    availability = await getAvailability()
  } catch {
    availability = null
  }
  let cron: { lastHealth: string | null; lastAggregate: string | null } | null = null
  try {
    cron = await getCronStatus()
  } catch {
    cron = null
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

        {/* Verfügbarkeit (Statuspage-Streifen) */}
        <h2 className="cx-h2">
          Verfügbarkeit <span>· letzte 24 Stunden</span>
        </h2>
        {availability ? <AvailabilityStrip data={availability} /> : <Unavailable />}

        {/* Keycloak-Kennzahlen: Nutzer & Aktivität */}
        <h2 className="cx-h2">
          Keycloak <span>· Nutzer &amp; Aktivität</span>
        </h2>
        {intraday && stats ? (
          <KeycloakStats totalUsers={stats.kpis.totalUsers} m={intraday.metrics} />
        ) : (
          <Unavailable />
        )}

        {/* Neue Nutzer */}
        <h2 className="cx-h2">
          Neue Nutzer <span>· Stunde / 24 h / 7 Tage / 30 Tage</span>
        </h2>
        {newUsers ? (
          <ChartCard title="Neu angelegte Nutzer" hint="Neu angelegte Konten je Zeitraum">
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
          Zeitreihen <span>· Tag / Stunde</span>
        </h2>
        {stats ? (
          <ChartCard title="Logins und Fehler" hint="Quelle: Keycloak-Events LOGIN und LOGIN_ERROR · Umschaltbar Tag/Stunde">
            <LoginsRangeChart daily={stats.series} hourly={intraday?.hourly ?? null} />
          </ChartCard>
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

        {/* Reports */}
        <h2 className="cx-h2">
          Reports <span>· Mail + PDF an die Alert-Adresse</span>
        </h2>
        <ReportButtons />

        <div className="cx-cronbar">
          <span className="cx-cronbar-t">Letzte Job-Läufe</span>
          <span>
            Health-Check: <b>{cron?.lastHealth ?? 'noch nie'}</b>
            {cron?.lastHealth ? ' Uhr' : ''}
          </span>
          <span>
            Aggregation: <b>{cron?.lastAggregate ?? 'noch nie'}</b>
            {cron?.lastAggregate ? ' Uhr' : ''}
          </span>
        </div>

        <footer className="cx-footer">
          Datenquelle: Keycloak Admin API (Events, Users). Zugriff nur für Support-Rollen;
          Kundencheck-Abfragen werden nicht protokolliert.
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
    <div className="cx-kpis cx-kpis--3">
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
        <div className="cx-kpi-n">{de(k.newUsers24h)}</div>
        <div className="cx-kpi-l">Neue Nutzer (24 h)</div>
        <div className="cx-kpi-t flat">neu angelegte Konten</div>
        <Sparkline values={stats.series.map((p) => p.newUsers)} />
      </div>
    </div>
  )
}

function KeycloakStats({ totalUsers, m }: { totalUsers: number; m: Keycloak24hMetrics }) {
  return (
    <div className="cx-kpis cx-kpis--3">
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
          <div className="cx-card-hint">letzte 24 Stunden · Logins &amp; eindeutige Nutzer</div>
          {ops.loginsByClient.length === 0 ? (
            <div className="cx-empty">Keine Logins.</div>
          ) : (
            <ul className="cx-toplist">
              {ops.loginsByClient.map((c) => (
                <li key={c.clientId}>
                  <div className="cx-toplist-row">
                    <b>{c.clientId}</b>
                    <span>
                      {de(c.count)} <em className="cx-toplist-sub">· {de(c.uniqueUsers)} Nutzer</em>
                    </span>
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
          <div className="cx-tablewrap">
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
          </div>
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
