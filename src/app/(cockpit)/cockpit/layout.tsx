/**
 * Hülle aller Cockpit-Bereiche: Anmeldung prüfen, Seitenleiste, Inhaltsspalte.
 *
 * Die Bereiche sind eigene Routen, damit jede Seite nur ihre eigenen Daten
 * lädt. Früher hing alles an einer Seite — jeder Aufruf holte sämtliche
 * Kennzahlen, auch die, die niemand ansah.
 */
import React from 'react'
import { redirect } from 'next/navigation'
import { canCockpit, canKundencheck, cockpitRole, getCockpitSession, supportRole } from '@/lib/auth/guard'
import { visibleDashboards } from '@/lib/metabase'
import { CockpitNav } from '@/components/cockpit/CockpitNav'

export const dynamic = 'force-dynamic'

export default async function CockpitBereichsLayout({ children }: { children: React.ReactNode }) {
  const session = await getCockpitSession()
  if (!session) redirect('/api/auth/login?next=/cockpit')

  const darfCockpit = canCockpit(session)
  const darfKundencheck = canKundencheck(session)
  if (!darfCockpit && !darfKundencheck) {
    return (
      <div className="cx-app">
        <main className="cx-noaccess cx-glas">
          <h1>Kein Zugriff</h1>
          <p>
            Für das Migrations-Cockpit ist die Rolle <code>{cockpitRole()}</code> (oder{' '}
            <code>{supportRole()}</code>) erforderlich. Ihr Konto hat diese Rolle nicht.
          </p>
          <a className="cx-knopf" href="/api/auth/logout">
            Abmelden
          </a>
        </main>
      </div>
    )
  }

  const person = session.name || session.email || 'Angemeldet'
  const rollen = `Rolle: ${session.roles.join(', ') || '—'}`

  return (
    <div className="cx-app">
      <CockpitNav
        person={person}
        rollen={rollen}
        darfCockpit={darfCockpit}
        dashboards={visibleDashboards(session).map((d) => ({ key: d.key, title: d.title }))}
      />
      <main className="cx-main">{children}</main>
    </div>
  )
}
