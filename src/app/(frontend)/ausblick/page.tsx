import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'
import { getRoadmapGroups } from '@/lib/content'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ausblick auf Version 2 · LüMobil Hilfecenter',
}

// Ordnet dem Status eine Badge-Farbe zu (fällt für unbekannte Werte auf „niedrig“ zurück).
const STATUS_CLASS: Record<string, string> = {
  'in Vorbereitung': 'mittel',
  geplant: 'niedrig',
  'in Prüfung': 'offen',
}

export default async function OutlookPage() {
  const groups = await getRoadmapGroups()

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

      {groups.map((group) => (
        <section key={group.heading} style={{ marginBottom: 34 }}>
          {group.kicker && <p className="lm-kicker">{group.kicker}</p>}
          <h3 className="lm-h2" style={{ marginTop: 4 }}>
            {group.heading}
          </h3>
          {group.intro && (
            <p style={{ maxWidth: 680, fontSize: 14.5, lineHeight: 1.6, color: '#3F3B3B' }}>
              {group.intro}
            </p>
          )}
          <div className="lm-grid" style={{ marginTop: 14 }}>
            {group.items.map((item, i) => (
              <div key={i} className="lm-roadmap-card">
                <span className={`lm-badge ${STATUS_CLASS[item.status] ?? 'niedrig'}`}>
                  {item.status}
                </span>
                <h4>{item.title}</h4>
                {item.text && <p>{item.text}</p>}
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
