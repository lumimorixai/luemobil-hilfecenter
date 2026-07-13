'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'

const TABS = [
  { href: '/', label: 'Hilfe-Center' },
  { href: '/stoerungen', label: 'Aktuelle Störungen' },
  { href: '/handbuch', label: 'LüMobil Handbuch' },
  { href: '/fragen', label: 'Offene Fragen' },
  { href: '/fehler', label: 'Bekannte Fehler' },
  { href: '/testen', label: 'Testen & Mitmachen' },
]

export function TabNav() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [globalTerm, setGlobalTerm] = useState('')

  // Auf der Suchseite das Feld mit dem aktuellen Query füllen
  useEffect(() => {
    if (pathname === '/suche') setGlobalTerm(searchParams.get('q') ?? '')
  }, [pathname, searchParams])

  function onGlobalSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = globalTerm.trim()
    router.push(q ? `/suche?q=${encodeURIComponent(q)}` : '/suche')
  }

  return (
    <div className="lm-tabbar">
      <form className="lm-global-search" role="search" onSubmit={onGlobalSubmit}>
        <span className="lm-search-icon" aria-hidden="true">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7A7474"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.5" y2="16.5" />
          </svg>
        </span>
        <input
          type="search"
          value={globalTerm}
          onChange={(e) => setGlobalTerm(e.target.value)}
          placeholder="Alles durchsuchen …"
          aria-label="Gesamtes Hilfecenter durchsuchen"
        />
      </form>
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
      </nav>
    </div>
  )
}
