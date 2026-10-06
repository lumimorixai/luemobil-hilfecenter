/**
 * Hülle aller Cockpit-Bereiche: Anmeldung prüfen, Seitenleiste, Inhaltsspalte.
 *
 * Die Bereiche sind eigene Routen, damit jede Seite nur ihre eigenen Daten
 * lädt. Früher hing alles an einer Seite — jeder Aufruf holte sämtliche
 * Kennzahlen, auch die, die niemand ansah.
 */
import React from 'react'
import { redirect } from 'next/navigation'
import {
  canCallcenter,
  canCockpit,
  canKundencheck,
  cockpitRole,
  getCockpitSession,
  supportRole,
} from '@/lib/auth/guard'
import { visibleDashboards } from '@/lib/metabase'
import { CockpitNav } from '@/components/cockpit/CockpitNav'
import { FokusKopf } from '@/components/cockpit/FokusKopf'

export const dynamic = 'force-dynamic'

export default async function CockpitBereichsLayout({ children }: { children: React.ReactNode }) {
  const session = await getCockpitSession()
  if (!session) redirect('/api/auth/login?next=/cockpit')

  const darfCockpit = canCockpit(session)
  const darfKundencheck = canKundencheck(session)
  const darfCallcenter = canCallcenter(session)
  if (!darfCockpit && !darfKundencheck && !darfCallcenter) {
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

  /*
   * Fokussierte Ansicht für Konten mit genau EINEM zugänglichen Bereich —
   * Servicemitarbeitende mit der Kundencheck-Rolle, oder Kräfte, die nur Fälle
   * abarbeiten. Für sie ist eine Seitenleiste mit einem einzigen Punkt kein
   * Wegweiser, sondern verbrauchter Platz; sie weckt zudem die Erwartung, es
   * gäbe mehr zu sehen.
   *
   * Entschieden wird an der Rolle, nicht am Pfad: Wer nur einen Bereich darf,
   * wird von allen übrigen Seiten ohnehin dorthin umgeleitet (guard.ts). Die
   * Rollenprüfung selbst bleibt unverändert serverseitig in jeder Seite und
   * jedem Endpunkt — hier wird sie nur sichtbar.
   */
  const nurKundencheck = darfKundencheck && !darfCockpit && !darfCallcenter
  const nurCallcenter = darfCallcenter && !darfCockpit && !darfKundencheck
  if (nurKundencheck || nurCallcenter) {
    return (
      <div className="cx-app cx-app--fokus">
        <FokusKopf
          titel={nurKundencheck ? 'Kundencheck' : 'Fälle abarbeiten'}
          person={person}
          rollen={rollen}
        />
        <main className="cx-main">{children}</main>
      </div>
    )
  }

  return (
    <div className="cx-app">
      <CockpitNav
        person={person}
        rollen={rollen}
        darfCockpit={darfCockpit}
        darfCallcenter={darfCallcenter}
        dashboards={visibleDashboards(session).map((d) => ({ key: d.key, title: d.title }))}
      />
      <main className="cx-main">{children}</main>
    </div>
  )
}
