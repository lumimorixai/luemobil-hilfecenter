'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

const TABS = [
  { href: '/', label: 'Hilfe-Center' },
  { href: '/handbuch', label: 'App-Handbuch' },
  { href: '/fragen', label: 'Offene Fragen' },
  { href: '/fehler', label: 'Bekannte Fehler' },
]

export function TabNav() {
  const pathname = usePathname()
  return (
    <nav className="lm-tabs" aria-label="Bereiche">
      {TABS.map((tab) => {
        const active =
          tab.href === '/' ? pathname === '/' || pathname.startsWith('/artikel') : pathname.startsWith(tab.href)
        return (
          <Link key={tab.href} href={tab.href} className={`lm-tab${active ? ' active' : ''}`}>
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
