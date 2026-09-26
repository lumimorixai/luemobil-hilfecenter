/**
 * Dashboards — die LüMobil-Auswertungen aus Metabase, hier eingebettet.
 *
 * Löst die frühere eigene Seite /kennzahlen ab: gleiche Navigation, gleiche
 * Kopfzeile, gleiche Rollenprüfung. Reihenfolge bleibt streng: angemeldet? →
 * darf die Rolle dieses Dashboard sehen? → erst dann Token signieren.
 */
import Link from 'next/link'
import { seiteCockpit } from '@/lib/auth/guard'
import {
  canSeeDashboard,
  dashboardEmbedUrl,
  dashboards,
  metabaseConfigured,
  visibleDashboards,
} from '@/lib/metabase'
import { DashboardFrame } from '@/components/cockpit/DashboardFrame'
import { Seitenkopf } from '@/components/cockpit/bausteine'

export const dynamic = 'force-dynamic'

export default async function DashboardSeite({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>
}) {
  const session = await seiteCockpit('/cockpit/dashboards')

  if (!metabaseConfigured()) {
    return (
      <>
        <Seitenkopf titel="Dashboards" unterzeile="Metabase-Auswertungen" />
        <div className="cx-card">
          <div className="cx-empty">
            Die LüMobil-Dashboards sind auf diesem System noch nicht eingerichtet
            (METABASE_URL, METABASE_DASHBOARDS). Siehe docs/KENNZAHLEN.md.
          </div>
        </div>
      </>
    )
  }

  const params = await searchParams
  const visible = visibleDashboards(session)
  const requested = (params.d || '').toLowerCase()
  const requestedExists = requested && dashboards().some((d) => d.key === requested)

  if (visible.length === 0 || (requestedExists && !canSeeDashboard(session, requested))) {
    return (
      <>
        <Seitenkopf titel="Dashboards" unterzeile="Metabase-Auswertungen" />
        <div className="cx-card">
          <div className="cx-empty">
            <strong>Kein Zugriff.</strong> Für dieses Dashboard fehlt Ihrem Konto die Berechtigung.
          </div>
        </div>
      </>
    )
  }

  const current = visible.find((d) => d.key === requested) ?? visible[0]
  const url = dashboardEmbedUrl(current)

  return (
    <>
      <Seitenkopf
        titel="Dashboards"
        unterzeile="Die LüMobil-Auswertungen · Datenstand letzte Nacht"
      >
        {visible.length > 1 && (
          <nav className="cx-schalter cx-pille" aria-label="Dashboards">
            {visible.map((d) => (
              <Link
                key={d.key}
                href={`/cockpit/dashboards?d=${d.key}`}
                className={d.key === current.key ? 'an' : undefined}
                aria-current={d.key === current.key ? 'page' : undefined}
              >
                {d.title}
              </Link>
            ))}
          </nav>
        )}
      </Seitenkopf>

      <div className="cx-card cx-embed">
        <div className="cx-embed-kopf">
          <span className="cx-punkt cx-punkt--ok" />
          <div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{current.title}</div>
            <div className="cx-card-hint" style={{ marginBottom: 0, marginTop: 3 }}>
              {current.description || 'Metabase-Auswertung'}
            </div>
          </div>
          <span className="cx-karte-quelle">
            Signiert eingebettet · Token gilt zehn Minuten
          </span>
        </div>
        {url ? (
          <DashboardFrame
            dashboardKey={current.key}
            title={current.title}
            initialUrl={url}
            sizing={current.sizing}
          />
        ) : (
          <div className="cx-empty" style={{ margin: 24 }}>
            Das Dashboard kann derzeit nicht angezeigt werden.
          </div>
        )}
      </div>
    </>
  )
}
