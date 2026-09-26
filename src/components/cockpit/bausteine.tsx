/**
 * Wiederkehrende Bausteine der Cockpit-Bereiche.
 *
 * Aufbau nach dem Entwurf: Jede Karte nennt Überschrift, Quelle und Zeitraum;
 * eine Leitkennzahl je Block, die Nebenzahlen kleiner. Die Bausteine sind
 * Server-Komponenten — nur die Diagramme sind interaktiv.
 */
import type {
  Availability,
  CockpitStats,
  DayEvents,
  Keycloak24hMetrics,
  Operations,
} from '@/lib/cockpit/types'
import type { Reporting } from '@/lib/reporting/types'
import { ChartCard, DualLineChart, Sparkline } from '@/components/cockpit/charts'

export function de(n: number): string {
  return n.toLocaleString('de-DE')
}

export function euro(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

/** Datum JJJJ-MM-TT → TT.MM. */
function tagKurz(iso: string): string {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`
}

/** Seitenkopf: Titel, Einordnung, rechts Platz für Schalter. */
export function Seitenkopf({
  titel,
  unterzeile,
  children,
}: {
  titel: string
  unterzeile: string
  children?: React.ReactNode
}) {
  return (
    <header className="cx-kopf">
      <div>
        <h1>{titel}</h1>
        <div className="cx-kopf-sub">{unterzeile}</div>
      </div>
      {children && <div className="cx-kopf-rechts">{children}</div>}
    </header>
  )
}

export function Karte({
  titel,
  quelle,
  children,
  className = '',
}: {
  titel?: string
  quelle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`cx-card ${className}`}>
      {(titel || quelle) && (
        <div className="cx-karte-kopf">
          {titel && <h2 className="cx-karte-titel">{titel}</h2>}
          {quelle && <span className="cx-karte-quelle">{quelle}</span>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Kennzahl({
  zahl,
  label,
  unten,
  akzent = false,
  ton,
}: {
  zahl: string
  label: string
  unten?: string
  akzent?: boolean
  ton?: 'up' | 'down' | 'flat'
}) {
  return (
    <div className={`cx-kpi${akzent ? ' cx-kpi--akzent' : ''}`}>
      <div className="cx-kpi-n">{zahl}</div>
      <div className="cx-kpi-l">{label}</div>
      {unten && <div className={`cx-kpi-t ${ton ?? 'flat'}`}>{unten}</div>}
    </div>
  )
}

export function Unavailable() {
  return <div className="cx-unavailable">Daten derzeit nicht verfügbar.</div>
}

/** Waagerechte Rangliste mit Balken — für Segmente, Gebiete, Clients, Fehler. */
export function Rangliste({
  zeilen,
}: {
  zeilen: { name: string; wert: number; anzeige: string; zusatz?: string }[]
}) {
  const max = Math.max(1, ...zeilen.map((z) => z.wert))
  if (zeilen.length === 0) return <div className="cx-empty">Keine Daten.</div>
  return (
    <div className="cx-rang">
      {zeilen.map((z) => (
        <div className="cx-rang-zeile" key={z.name}>
          <span className="cx-rang-name" title={z.name}>
            {z.name}
          </span>
          <span className="cx-rang-spur">
            <i style={{ width: `${Math.max(2, Math.round((z.wert / max) * 100))}%` }} />
          </span>
          <span className="cx-rang-wert">
            {z.anzeige}
            {z.zusatz && <em className="cx-toplist-sub"> · {z.zusatz}</em>}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Trichter: ein Weg mit Stufen, jede im Verhältnis zur ersten. */
export function Trichter({
  stufen,
}: {
  stufen: { name: string; wert: number; anteil: string }[]
}) {
  const start = stufen[0]?.wert || 1
  return (
    <div className="cx-trichter">
      {stufen.map((s) => (
        <div className="cx-trichter-zeile" key={s.name}>
          <span className="cx-trichter-name">{s.name}</span>
          <span className="cx-trichter-spur">
            <i style={{ width: `${Math.max(2, Math.round((s.wert / start) * 100))}%` }} />
          </span>
          <span className="cx-trichter-wert">{de(s.wert)}</span>
          <span className="cx-trichter-anteil">{s.anteil}</span>
        </div>
      ))}
    </div>
  )
}

/** Hinweis, wenn die Reporting-Datenbank nicht angebunden oder still ist. */
export function ReportingFehlt({ grund }: { grund: 'nicht konfiguriert' | 'nicht erreichbar' }) {
  return (
    <div className="cx-card">
      <div className="cx-empty">
        {grund === 'nicht konfiguriert'
          ? 'Die Reporting-Datenbank ist für dieses Cockpit nicht hinterlegt (REPORTING_DATABASE_URI). Siehe docs/REPORTING.md.'
          : 'Die Reporting-Datenbank antwortet gerade nicht. Die übrigen Zahlen sind davon nicht betroffen.'}
      </div>
    </div>
  )
}

/** Wie viele der Berechtigten sind im neuen System angekommen? */
export function AnkommenSection({ data, kurz = false }: { data: Reporting; kurz?: boolean }) {
  if (!data.verfuegbar) return <ReportingFehlt grund={data.grund} />
  const a = data.aktivierung
  const zeitraum = a.zeitraum
    ? `${tagKurz(a.zeitraum.von)} bis ${tagKurz(a.zeitraum.bis)}`
    : 'letzte sieben Tage mit Daten'

  return (
    <>
      <div className="cx-kpis cx-kpis--5">
        <Kennzahl zahl={`${de(a.quotePct)} %`} label="Aktivierungsquote" akzent />
        <Kennzahl zahl={de(a.mitKonto)} label="Mit Konto" />
        <Kennzahl zahl={de(a.ohneKonto)} label="Berechtigt, ohne Konto" />
        <Kennzahl zahl={de(a.berechtigteGesamt)} label="Berechtigte gesamt" />
        <Kennzahl zahl={`+${de(a.neu7Tage)}`} label="Neue Konten, 7 Tage" unten={zeitraum} />
      </div>

      {!kurz && data.trichter.length > 0 && (
        <Karte titel="Vom Abo zum laufenden Ticket" quelle="fünf Stufen">
          <Trichter
            stufen={data.trichter.map((t) => ({
              name: t.schritt,
              wert: t.anzahl,
              anteil:
                data.trichter[0].anzahl > 0
                  ? `${((t.anzahl / data.trichter[0].anzahl) * 100).toLocaleString('de-DE', {
                      maximumFractionDigits: 1,
                    })} %`
                  : '—',
            }))}
          />
        </Karte>
      )}

      <div className="cx-split">
        <Karte titel="Aktivierung je Segment" quelle="Anteil mit Konto">
          <Rangliste
            zeilen={data.segmente.map((s) => ({
              name: s.bestandssegment,
              wert: s.quote_prozent,
              anzeige: `${de(s.quote_prozent)} %`,
              zusatz: `${de(s.aktivierte)} von ${de(s.berechtigte)}`,
            }))}
          />
        </Karte>
        <Karte titel="Schwächste Postleitzahlen" quelle="ab 20 Berechtigten">
          <Rangliste
            zeilen={data.plz.map((p) => ({
              name: `${p.plz} ${p.ort}`,
              wert: p.quote_prozent,
              anzeige: `${de(p.quote_prozent)} %`,
              zusatz: `${de(p.offen)} offen`,
            }))}
          />
        </Karte>
      </div>
    </>
  )
}

/** Bestellungen, Umsatz und Auslieferung. */
export function UmsatzSection({ data }: { data: Reporting }) {
  if (!data.verfuegbar) return <ReportingFehlt grund={data.grund} />
  const v = data.verkauf
  return (
    <>
      <div className="cx-kpis cx-kpis--4">
        <Kennzahl zahl={euro(v.umsatzBrutto)} label="Umsatz brutto" akzent />
        <Kennzahl zahl={de(v.verkaeufe)} label="Verkäufe" unten={`${de(v.bestellungen)} Bestellungen`} />
        <Kennzahl zahl={`${de(v.erfolgPct)} %`} label="Erfolgreich ausgeliefert" />
        <Kennzahl zahl={de(v.abbrueche)} label="Abgebrochene Bestellungen" />
      </div>
      {data.tage.length > 0 && (
        <ChartCard title="Verkäufe je Tag" hint="Verkäufe und Abbrüche der letzten 30 Tage">
          <DualLineChart
            points={data.tage.map((t) => ({
              label: tagKurz(t.tag),
              a: t.verkaeufe,
              b: t.abbrueche,
            }))}
            maxTicks={7}
          />
        </ChartCard>
      )}
    </>
  )
}

export function KpiRow({ stats }: { stats: CockpitStats }) {
  const k = stats.kpis
  const trend = stats.loginTrendPct
  const rate = k.errorRatePct.toLocaleString('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  return (
    <div className="cx-kpis cx-kpis--4">
      <div className="cx-kpi">
        <div className="cx-kpi-n">{de(k.successfulLogins)}</div>
        <div className="cx-kpi-l">Anmeldungen heute</div>
        {trend != null && (
          <div className={`cx-kpi-t ${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? '+' : ''}
            {trend} % gegenüber gestern
          </div>
        )}
        <Sparkline values={stats.series.slice(-14).map((p) => p.logins)} />
      </div>
      <div className="cx-kpi">
        <div className="cx-kpi-n">{de(k.failedLogins)}</div>
        <div className="cx-kpi-l">Fehlversuche</div>
        <div className="cx-kpi-t flat">Fehlerquote {rate} %</div>
        <Sparkline values={stats.series.slice(-14).map((p) => p.loginErrors)} ton="no" />
      </div>
      <div className="cx-kpi">
        <div className="cx-kpi-n">{de(k.newUsers24h)}</div>
        <div className="cx-kpi-l">Neue Konten heute</div>
        <div className="cx-kpi-t flat">migriert und selbst registriert</div>
        <Sparkline values={stats.series.slice(-14).map((p) => p.newUsers)} />
      </div>
      <div className="cx-kpi">
        <div className="cx-kpi-n">{de(k.totalUsers)}</div>
        <div className="cx-kpi-l">Konten gesamt</div>
        <div className="cx-kpi-t flat">Bestand im Realm</div>
        <Sparkline values={stats.series.slice(-14).map((p) => p.totalUsers ?? 0)} />
      </div>
    </div>
  )
}

export function KeycloakStats({ totalUsers, m }: { totalUsers: number; m: Keycloak24hMetrics }) {
  return (
    <div className="cx-kpis cx-kpis--3">
      <Kennzahl zahl={de(totalUsers)} label="Konten im Realm" />
      <Kennzahl zahl={de(m.uniqueUsers)} label="Eindeutige Nutzende (24 h)" />
      <Kennzahl zahl={de(m.activeClients)} label="Aktive Apps (24 h)" />
    </div>
  )
}

export function OpsSection({ ops }: { ops: Operations }) {
  const s = ops.support24h
  const w = ops.support7d
  const tiles = [
    { n: s.passwordResetRequested, week: w.passwordResetRequested, l: 'Passwort-Reset angefordert' },
    { n: s.passwordResetDone, week: w.passwordResetDone, l: 'Reset abgeschlossen' },
    { n: s.passwordChanged, week: w.passwordChanged, l: 'Passwort geändert' },
    { n: s.verifyEmailSent, week: w.verifyEmailSent, l: 'Verifizierungs-Mail gesendet' },
    { n: s.verifyEmailDone, week: w.verifyEmailDone, l: 'E-Mail bestätigt' },
    { n: s.registrations, week: w.registrations, l: 'Selbstregistrierungen' },
  ]
  return (
    <>
      <div className="cx-kpis cx-kpis--3">
        {tiles.map((t) => (
          <Kennzahl key={t.l} zahl={de(t.n)} label={t.l} unten={`7 Tage: ${de(t.week)}`} />
        ))}
      </div>
      <Karte titel="Anmeldungen je App" quelle="heute">
        <Rangliste
          zeilen={ops.loginsByClient.map((c) => ({
            name: c.clientId,
            wert: c.count,
            anzeige: de(c.count),
            zusatz: `${de(c.uniqueUsers)} Nutzende`,
          }))}
        />
      </Karte>
    </>
  )
}

export function ErrorSection({ day }: { day: DayEvents }) {
  return (
    <div className="cx-split">
      <Karte titel="Fehlgeschlagene Anmeldungen" quelle="live aus Keycloak · heute">
        {day.rows.length === 0 ? (
          <div className="cx-empty">Keine Fehler heute.</div>
        ) : (
          <div className="cx-tablewrap">
            <table className="cx-table">
              <thead>
                <tr>
                  <th>Zeit</th>
                  <th>Fehler</th>
                  <th>App</th>
                  <th>Benutzername</th>
                </tr>
              </thead>
              <tbody>
                {day.rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.time}</td>
                    <td>
                      <span
                        className={`cx-pill ${r.error === 'invalid_user_credentials' ? 'amber' : 'red'}`}
                      >
                        {r.error}
                      </span>
                    </td>
                    <td className="leise">{r.clientId}</td>
                    <td className="cx-mono leise">{r.username}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Karte>
      <Karte titel="Fehlerarten" quelle="heute">
        {day.byType.length === 0 ? (
          <div className="cx-empty">Keine Fehler heute.</div>
        ) : (
          <ul className="cx-toplist">
            {day.byType.map((t) => (
              <li key={t.error}>
                <div className="cx-toplist-row">
                  <b>{t.error}</b>
                  <span>{de(t.count)}</span>
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
            {a.clientId ? ` über die App ${a.clientId}` : ''} – kein Treffer. Der Admin-Zugang ist
            abgeschottet.
          </div>
        ))}
      </Karte>
    </div>
  )
}

/** Kurzfassung der Verfügbarkeit für den Überblick. */
export function StatusKurz({ data }: { data: Availability }) {
  return (
    <div className="cx-statuszeile">
      {data.services.map((s) => (
        <div key={s.key}>
          <span
            className={`cx-punkt cx-punkt--${
              !s.configured ? 'off' : s.current === 'ok' ? 'ok' : s.current === 'down' ? 'no' : 'off'
            }`}
          />
          <span>{s.label}</span>
          <span className={`cx-status-wert${s.current === 'down' ? ' no' : ''}`}>
            {s.configured ? `${s.uptimePct.toLocaleString('de-DE')} %` : 'nicht eingerichtet'}
          </span>
        </div>
      ))}
    </div>
  )
}
