'use client'

/**
 * Seitenleiste des Cockpits: zehn Punkte in vier Gruppen.
 *
 * Ersetzt die frühere Endlos-Seite. Wer nur die Kundencheck-Berechtigung hat,
 * sieht ausschließlich die Gruppe „Werkzeuge" — die Rollentrennung bleibt
 * unverändert, sie wird nur sichtbar.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeSchalter } from './ThemeSchalter'

type Punkt = { href: string; label: string; icon: keyof typeof ICONS; nurCockpit?: boolean }
type Gruppe = { titel: string; punkte: Punkt[] }

const GRUPPEN: Gruppe[] = [
  {
    titel: 'Lage',
    punkte: [
      { href: '/cockpit', label: 'Überblick', icon: 'ueberblick', nurCockpit: true },
      { href: '/cockpit/ankommen', label: 'D-Ticket Migration', icon: 'ankommen', nurCockpit: true },
      { href: '/cockpit/umsatz', label: 'Tickets & Umsatz', icon: 'umsatz', nurCockpit: true },
    ],
  },
  {
    titel: 'Betrieb',
    punkte: [
      { href: '/cockpit/anmeldungen', label: 'Anmeldungen', icon: 'anmeldungen', nurCockpit: true },
      { href: '/cockpit/verfuegbarkeit', label: 'Verfügbarkeit', icon: 'verfuegbarkeit', nurCockpit: true },
      { href: '/cockpit/support', label: 'Support', icon: 'support', nurCockpit: true },
    ],
  },
  {
    titel: 'Auswertungen',
    punkte: [{ href: '/cockpit/dashboards', label: 'Dashboards', icon: 'dashboards', nurCockpit: true }],
  },
  {
    titel: 'Werkzeuge',
    punkte: [
      { href: '/cockpit/kundencheck', label: 'Kundencheck', icon: 'kundencheck' },
      { href: '/cockpit/daten', label: 'Daten & Jobs', icon: 'daten', nurCockpit: true },
    ],
  },
]

const ICONS = {
  ueberblick: (
    <>
      <circle cx="8" cy="8" r="6.2" />
      <path d="M8 4.4v3.6l2.4 1.5" />
    </>
  ),
  ankommen: (
    <>
      <path d="M2.6 12.4 7 6.8l3 2.6 3.4-5" />
      <circle cx="7" cy="6.8" r="1.1" />
    </>
  ),
  umsatz: (
    <>
      <rect x="2.4" y="4.2" width="11.2" height="7.6" rx="2" />
      <path d="M2.4 7.4h11.2" />
    </>
  ),
  anmeldungen: (
    <>
      <path d="M6.4 3.2h4.4a1.8 1.8 0 0 1 1.8 1.8v6a1.8 1.8 0 0 1-1.8 1.8H6.4" />
      <path d="M8.6 8H3.2m0 0 2-2m-2 2 2 2" />
    </>
  ),
  verfuegbarkeit: <path d="M2 8.6h2.8L6.4 5l2.6 6 1.8-3.4H14" />,
  support: (
    <>
      <circle cx="8" cy="8" r="5.6" />
      <circle cx="8" cy="8" r="2" />
    </>
  ),
  dashboards: (
    <>
      <rect x="2.4" y="2.6" width="4.8" height="4.8" rx="1.4" />
      <rect x="8.8" y="2.6" width="4.8" height="4.8" rx="1.4" />
      <rect x="2.4" y="8.8" width="4.8" height="4.8" rx="1.4" />
      <rect x="8.8" y="8.8" width="4.8" height="4.8" rx="1.4" />
    </>
  ),
  kundencheck: (
    <>
      <circle cx="7.2" cy="7.2" r="4.2" />
      <path d="m10.4 10.4 3 3" />
    </>
  ),
  daten: (
    <>
      <ellipse cx="8" cy="4.4" rx="5" ry="2" />
      <path d="M3 4.4v7.2c0 1.1 2.2 2 5 2s5-.9 5-2V4.4" />
    </>
  ),
}

/** Drei Striche bzw. Kreuz — je nachdem, ob das Menü offen ist. */
function BurgerIcon({ offen }: { offen: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {offen ? (
        <>
          <path d="M5 5l10 10" />
          <path d="M15 5L5 15" />
        </>
      ) : (
        <>
          <path d="M3 6h14" />
          <path d="M3 10h14" />
          <path d="M3 14h14" />
        </>
      )}
    </svg>
  )
}

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}

/**
 * Das LüMobil-Zeichen — dasselbe wie im Kopf des Hilfe-Centers, damit intern
 * und öffentlich dieselbe Marke steht. Der Verlauf ist Teil des Zeichens; die
 * Regel „keine Verläufe" gilt für Flächen, nicht für das Signet.
 */
function LuemobilZeichen() {
  return (
    <svg
      className="cx-nav-logo"
      viewBox="0 0 1024 1024"
      role="img"
      aria-label="LüMobil"
    >
      <defs>
        <linearGradient
          id="cx_lm_grad"
          x1="451.37"
          y1="293.12"
          x2="744.85"
          y2="642.87"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ff8200" />
          <stop offset=".36" stopColor="#ff3d59" />
          <stop offset=".53" stopColor="#ff00aa" />
          <stop offset=".72" stopColor="#b945c1" />
          <stop offset=".81" stopColor="#8579d2" />
          <stop offset=".91" stopColor="#43bbe8" />
          <stop offset="1" stopColor="#00ffff" />
        </linearGradient>
      </defs>
      <polygon
        fill="url(#cx_lm_grad)"
        points="803.87 223.15 231.68 509.24 517.77 509.24 517.77 795.33 803.87 223.15"
      />
    </svg>
  )
}

export function CockpitNav({
  person,
  rollen,
  darfCockpit,
  dashboards,
}: {
  person: string
  rollen: string
  darfCockpit: boolean
  dashboards: { key: string; title: string }[]
}) {
  const pfad = usePathname()
  const aktiv = (href: string) => (href === '/cockpit' ? pfad === href : pfad.startsWith(href))

  /*
   * Auf schmalen Schirmen klappt die Navigation zusammen. Ohne das standen
   * neun Punkte als Wolke nebeneinander, ohne Gruppen — auf dem Handy
   * unbrauchbar. Auf breiten Schirmen ändert sich nichts: Das Menü ist dort
   * immer offen und der Knopf ausgeblendet.
   */
  const [offen, setOffen] = useState(false)

  // Nach jedem Wechsel schließen, sonst verdeckt das Menü die neue Seite.
  useEffect(() => {
    setOffen(false)
  }, [pfad])

  // Escape schließt — erwartetes Verhalten bei allem, was sich überlagert.
  useEffect(() => {
    if (!offen) return
    const zu = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOffen(false)
    }
    window.addEventListener('keydown', zu)
    return () => window.removeEventListener('keydown', zu)
  }, [offen])

  const aktuellerBereich =
    GRUPPEN.flatMap((g) => g.punkte).find((p) => aktiv(p.href))?.label ?? 'Cockpit'

  return (
    <nav className="cx-nav cx-glas" aria-label="Bereiche" data-offen={offen}>
      <div className="cx-nav-kopf">
        <div className="cx-nav-marke">
          <LuemobilZeichen />
          <div>
            <div className="cx-nav-name">LüMobil</div>
            <div className="cx-nav-sub">Cockpit</div>
          </div>
        </div>
        <span className="cx-nav-hier">{aktuellerBereich}</span>
        <button
          type="button"
          className="cx-nav-burger"
          onClick={() => setOffen((o) => !o)}
          aria-expanded={offen}
          aria-controls="cx-nav-body"
          aria-label={offen ? 'Menü schließen' : 'Menü öffnen'}
        >
          <BurgerIcon offen={offen} />
        </button>
      </div>

      <div className="cx-nav-body" id="cx-nav-body">

      {GRUPPEN.map((g) => {
        const sichtbar = g.punkte.filter((p) => darfCockpit || !p.nurCockpit)
        if (sichtbar.length === 0) return null
        return (
          <div key={g.titel}>
            <div className="cx-navgrp">{g.titel}</div>
            {sichtbar.map((p) => (
              <div key={p.href}>
                <Link href={p.href} className={`cx-navlink${aktiv(p.href) ? ' an' : ''}`}>
                  <Icon name={p.icon} />
                  <span>{p.label}</span>
                </Link>
                {p.href === '/cockpit/dashboards' &&
                  aktiv(p.href) &&
                  dashboards.map((d) => (
                    <Link
                      key={d.key}
                      href={`/cockpit/dashboards?d=${d.key}`}
                      className="cx-navsub"
                    >
                      {d.title}
                    </Link>
                  ))}
              </div>
            ))}
          </div>
        )
      })}

        <span className="cx-nav-luft" />

        <div className="cx-nav-fuss cx-glas-2">
          <b>{person}</b>
          <span>{rollen}</span>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ThemeSchalter />
            <a href="/api/auth/logout" style={{ fontSize: 12 }}>
              Abmelden
            </a>
          </div>
        </div>
      </div>
    </nav>
  )
}
