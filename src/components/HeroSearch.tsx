'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'

/**
 * Globale Suche im Hero (wie in der Vorlage). Leitet auf die Ergebnisseite
 * /suche weiter — identische Funktion wie zuvor in der Tab-Leiste.
 */
export function HeroSearch() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [term, setTerm] = useState('')

  useEffect(() => {
    if (pathname === '/suche') setTerm(searchParams.get('q') ?? '')
  }, [pathname, searchParams])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = term.trim()
    router.push(q ? `/suche?q=${encodeURIComponent(q)}` : '/suche')
  }

  return (
    <form className="lm-hero-search" role="search" onSubmit={onSubmit}>
      <span className="lm-search-icon" aria-hidden="true">
        <svg
          width="18"
          height="18"
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
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Alles durchsuchen — Artikel, Handbuch, Fragen, Fehler …"
        aria-label="Gesamtes Hilfecenter durchsuchen"
      />
    </form>
  )
}
