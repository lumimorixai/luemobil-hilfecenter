'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

const TABS = [
  { href: '/', label: 'Hilfe-Center' },
  { href: '/stoerungen', label: 'Aktuelle Störungen' },
  { href: '/handbuch', label: 'LüMobil Handbuch' },
  { href: '/fragen', label: 'Offene Fragen' },
  { href: '/fehler', label: 'Bekannte Fehler' },
  { href: '/testen', label: 'Testen & Mitmachen' },
]

export function TabNav({
  showKundencheck = false,
  showCockpit = false,
}: {
  showKundencheck?: boolean
  showCockpit?: boolean
}) {
  const pathname = usePathname()

  return (
    <div className="lm-tabbar">
      <nav className="lm-tabs" aria-label="Bereiche">
        {TABS.map((tab) => {
          const active =
            tab.href === '/'
              ? pathname === '/' || pathname.startsWith('/artikel')
              : pathname.startsWith(tab.href)
          return (
            <Link key={tab.href} href={tab.href} className={`lm-tab${active ? ' active' : ''}`}>
              {tab.label}
            </Link>
          )
        })}
        {/* Interne Reiter, jeweils nur mit der passenden Berechtigung. */}
        {showKundencheck && (
          <Link
            href="/kundencheck"
            className={`lm-tab lm-tab--support lm-tab--support-first${
              pathname.startsWith('/kundencheck') ? ' active' : ''
            }`}
          >
            Kundencheck
          </Link>
        )}
        {showCockpit && (
          <Link
            href="/cockpit"
            className={`lm-tab lm-tab--support${showKundencheck ? '' : ' lm-tab--support-first'}`}
          >
            Migrations-Cockpit
          </Link>
        )}
      </nav>
    </div>
  )
}
