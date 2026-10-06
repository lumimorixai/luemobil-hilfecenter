/**
 * Kopfzeile der fokussierten Ansicht — für Konten, die genau einen Bereich
 * sehen dürfen.
 *
 * Servicemitarbeitende brauchen den Kundencheck, nicht das Cockpit. Eine
 * Seitenleiste mit einem einzigen Punkt ist für sie kein Wegweiser, sondern
 * nur verbrauchter Platz; sie erweckt außerdem den Eindruck, es gäbe mehr zu
 * sehen. Deshalb bleibt hier nur, was wirklich gebraucht wird: wer angemeldet
 * ist und wie man sich abmeldet.
 *
 * Die Rollentrennung selbst ändert sich dadurch nicht — sie wird nur
 * sichtbar. Geprüft wird sie weiterhin serverseitig in jeder Seite und jedem
 * Endpunkt.
 */
import { LuemobilZeichen } from './LuemobilZeichen'
import { ThemeSchalter } from './ThemeSchalter'

export function FokusKopf({
  titel,
  person,
  rollen,
}: {
  titel: string
  person: string
  rollen: string
}) {
  return (
    <header className="cx-fokus-kopf cx-glas">
      <div className="cx-fokus-marke">
        <LuemobilZeichen className="cx-fokus-logo" />
        <div>
          <div className="cx-fokus-name">LüMobil</div>
          <div className="cx-fokus-titel">{titel}</div>
        </div>
      </div>

      <div className="cx-fokus-rechts">
        <div className="cx-fokus-person">
          <span>{person}</span>
          <em title={rollen}>{rollen}</em>
        </div>
        <ThemeSchalter />
        <a className="cx-knopf" href="/api/auth/logout">
          Abmelden
        </a>
      </div>
    </header>
  )
}
