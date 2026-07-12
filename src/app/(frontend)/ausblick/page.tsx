import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

export const metadata: Metadata = {
  title: 'Ausblick auf Version 2 · LüMobil Hilfecenter',
}

type Status = 'in Vorbereitung' | 'geplant' | 'in Prüfung'

type Item = {
  title: string
  status: Status
  text: string
}

type Group = {
  kicker: string
  heading: string
  intro: string
  items: Item[]
}

/**
 * Ausblick auf Version 2. Die Themen sind aus den heutigen Inhalten abgeleitet
 * (in Vorbereitung befindlicher Direkt-Ticketkauf, On-Demand-Shuttle sowie die
 * offenen Fragen zu Störungskommunikation, Anliegen-Routing und Erstattung).
 * Es handelt sich um einen unverbindlichen Planungsstand (Juli 2026) ohne
 * feste Termine.
 */
const GROUPS: Group[] = [
  {
    kicker: 'Tickets & Bezahlen',
    heading: 'Tickets direkt in der App kaufen',
    intro:
      'Der größte Sprung für Version 2: Fahrscheine sollen direkt in LüMobil erworben werden können, statt wie bisher nur informativ dargestellt zu werden.',
    items: [
      {
        title: 'Direkter Ticketkauf',
        status: 'in Vorbereitung',
        text: 'Der Button „Ticket kaufen“ wird aktiviert — vom Einzelticket bis zum Deutschlandticket, inklusive digitaler Hinterlegung im Konto.',
      },
      {
        title: 'Bezahlarten & Beleg',
        status: 'geplant',
        text: 'Gängige Bezahlverfahren, Kaufhistorie und automatische Belege für Erstattung und Abrechnung.',
      },
      {
        title: 'Self-Service für Erstattung & Stornierung',
        status: 'in Prüfung',
        text: 'Nutzende sollen Erstattungen und Stornierungen künftig selbst anstoßen können, statt sich an den Support wenden zu müssen.',
      },
    ],
  },
  {
    kicker: 'Störungen & Kommunikation',
    heading: 'Live-Informationen bei Störungen',
    intro:
      'Die aktuell extern eingebundene Störungsübersicht soll fester Bestandteil der App werden — mit aktiver Benachrichtigung statt passivem Nachschlagen.',
    items: [
      {
        title: 'Integrierte Störungsanzeige',
        status: 'geplant',
        text: 'Störungen und Ausfälle direkt in der Verbindungssuche und auf der Startseite, abgestimmt auf die eigene Route.',
      },
      {
        title: 'Push-Benachrichtigungen',
        status: 'in Prüfung',
        text: 'Optionale Hinweise, wenn auf einer gespeicherten Linie oder Lieblingsverbindung eine Störung auftritt.',
      },
    ],
  },
  {
    kicker: 'Anliegen & Support',
    heading: 'Fragen und Meldungen schneller bearbeiten',
    intro:
      'Die in Version 1 eingeführten Formulare für Fragen und Fehlermeldungen sollen enger mit den internen Abläufen der Stadtwerke verzahnt werden.',
    items: [
      {
        title: 'Anliegen-Routing ins CRM',
        status: 'in Prüfung',
        text: 'Eingereichte Fragen und Meldungen werden künftig automatisch an die zuständige Stelle weitergeleitet.',
      },
      {
        title: 'Rückmeldung an Nutzende',
        status: 'geplant',
        text: 'Wer eine Frage oder Meldung mit Kontaktdaten einreicht, erhält auf Wunsch eine Statusmeldung, sobald sie bearbeitet ist.',
      },
      {
        title: '„War dieser Artikel hilfreich?“',
        status: 'geplant',
        text: 'Kurzes Feedback direkt am Hilfeartikel, um die meistgelesenen Inhalte gezielt zu verbessern.',
      },
    ],
  },
  {
    kicker: 'Angebot & Komfort',
    heading: 'Mehr Mobilität, mehr Personalisierung',
    intro:
      'Weiterentwicklung der bestehenden Funktionen rund um Verbindungssuche, Konto und flexible Angebote.',
    items: [
      {
        title: 'On-Demand-Shuttle ausbauen',
        status: 'in Prüfung',
        text: 'Engere Einbindung des On-Demand-Shuttles in die Verbindungssuche und Buchung.',
      },
      {
        title: 'Bessere Suche & Personalisierung',
        status: 'geplant',
        text: 'Serverseitige Volltextsuche über alle Inhalte sowie stärker personalisierte Vorschläge auf Basis gespeicherter Favoriten.',
      },
    ],
  },
]

const STATUS_CLASS: Record<Status, string> = {
  'in Vorbereitung': 'mittel',
  geplant: 'niedrig',
  'in Prüfung': 'offen',
}

export default function OutlookPage() {
  return (
    <div>
      <h2 className="lm-section-title" style={{ marginTop: 0 }}>
        Ausblick auf Version 2
      </h2>
      <p style={{ maxWidth: 680, fontSize: 15, lineHeight: 1.6, color: '#3F3B3B' }}>
        Sie nutzen derzeit <strong>Version 1</strong> des LüMobil Hilfecenters. Hier sehen Sie, woran
        für die nächste Ausbaustufe gearbeitet wird. Die folgenden Punkte sind ein unverbindlicher
        Planungsstand (Stand: Juli 2026) und noch ohne feste Termine.
      </p>

      {GROUPS.map((group) => (
        <section key={group.heading} style={{ marginBottom: 34 }}>
          <p className="lm-kicker">{group.kicker}</p>
          <h3 className="lm-h2" style={{ marginTop: 4 }}>
            {group.heading}
          </h3>
          <p style={{ maxWidth: 680, fontSize: 14.5, lineHeight: 1.6, color: '#3F3B3B' }}>
            {group.intro}
          </p>
          <div className="lm-grid" style={{ marginTop: 14 }}>
            {group.items.map((item) => (
              <div key={item.title} className="lm-roadmap-card">
                <span className={`lm-badge ${STATUS_CLASS[item.status]}`}>{item.status}</span>
                <h4>{item.title}</h4>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="lm-short" style={{ marginTop: 8 }}>
        Sie vermissen etwas oder haben einen Wunsch für Version 2? Reichen Sie ihn als{' '}
        <Link href="/fragen">Frage</Link> ein oder melden Sie einen{' '}
        <Link href="/fehler">Fehler</Link> — Ihre Rückmeldungen fließen in die Planung ein.
      </div>
    </div>
  )
}
