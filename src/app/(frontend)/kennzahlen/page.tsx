import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCockpitSession } from '@/lib/auth/guard'
import {
  canSeeDashboard,
  dashboardEmbedUrl,
  dashboards,
  metabaseConfigured,
  visibleDashboards,
} from '@/lib/metabase'
import { DashboardFrame } from '@/components/cockpit/DashboardFrame'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Kennzahlen · LüMobil Hilfecenter',
}

/**
 * LüMobil-Dashboards aus Metabase (statische Einbettung). Reihenfolge:
 * 1. angemeldet? 2. darf die Rolle dieses Dashboard sehen? 3. erst dann
 * Token signieren. Ohne Berechtigung landet kein Token im HTML.
 */
export default async function KennzahlenPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; breit?: string }>
}) {
  const session = await getCockpitSession()
  if (!session) redirect('/api/auth/login?next=/kennzahlen')

  if (!metabaseConfigured()) {
    return (
      <div>
        <p className="lm-kicker">Kennzahlen</p>
        <div className="lm-short">Die LüMobil-Dashboards sind auf diesem System noch nicht eingerichtet.</div>
      </div>
    )
  }

  const params = await searchParams
  const visible = visibleDashboards(session)
  const requested = (params.d || '').toLowerCase()
  // Diagnose: ?breit=0 zeigt das Dashboard in der normalen 960-px-Spalte.
  // Damit lässt sich prüfen, ob die volle Breite an einem Darstellungsproblem
  // (z. B. Flackern im Browser) beteiligt ist.
  const wide = params.breit !== '0'

  // Ausdrücklich angefordertes, aber nicht erlaubtes Dashboard → kein Token.
  const requestedExists = requested && dashboards().some((d) => d.key === requested)
  if (visible.length === 0 || (requestedExists && !canSeeDashboard(session, requested))) {
    return (
      <div>
        <p className="lm-kicker">Kennzahlen</p>
        <div className="lm-short">
          <strong>Kein Zugriff.</strong> Für dieses Dashboard fehlt Ihrem Konto die Berechtigung.
        </div>
      </div>
    )
  }

  const current = visible.find((d) => d.key === requested) ?? visible[0]
  const url = dashboardEmbedUrl(current)

  return (
    // Breiter als die übliche Inhaltsspalte (960 px), damit Metabase Zahlen und
    // Titel nicht kürzt — bewusste Ausnahme vom Seitenraster.
    <div className={wide ? 'lm-dash-wide' : undefined}>
      <p className="lm-kicker">Kennzahlen · LüMobil</p>
      {visible.length > 1 && (
        <nav className="lm-chips" aria-label="Dashboards">
          {visible.map((d) => (
            <Link
              key={d.key}
              href={`/kennzahlen?d=${d.key}${wide ? '' : '&breit=0'}`}
              className={`lm-chip${d.key === current.key ? ' active' : ''}`}
              aria-current={d.key === current.key ? 'page' : undefined}
            >
              {d.title}
            </Link>
          ))}
        </nav>
      )}
      <p className="lm-dash-desc">
        {current.description}
        {current.description ? ' ' : ''}Datenstand: letzte Nacht.
      </p>
      {url ? (
        <DashboardFrame dashboardKey={current.key} title={current.title} initialUrl={url} sizing={current.sizing} />
      ) : (
        <div className="lm-short">Das Dashboard kann derzeit nicht angezeigt werden.</div>
      )}
    </div>
  )
}
