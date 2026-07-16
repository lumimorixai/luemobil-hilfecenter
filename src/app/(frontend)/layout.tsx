import type { Metadata } from 'next'
import React, { Suspense } from 'react'
import Link from 'next/link'
import { TabNav } from '@/components/TabNav'
import { HeroSearch } from '@/components/HeroSearch'
import '@fontsource-variable/inter'
import './globals.css'

export const metadata: Metadata = {
  title: 'LüMobil Hilfecenter · Stadtwerke Lübeck',
  description:
    'Antworten rund um Verbindungssuche, Abfahrten, Deutschlandticket, Konto und mehr — Hilfeartikel und häufige Fragen zur LüMobil-App.',
}

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <div className="lm-topbar" aria-hidden="true" />
        <header className="lm-header">
          <svg className="lm-hero-wm" viewBox="0 0 1024 1024" aria-hidden="true">
            <defs>
              <linearGradient
                id="lm_hero_grad"
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
              fill="url(#lm_hero_grad)"
              points="803.87 223.15 231.68 509.24 517.77 509.24 517.77 795.33 803.87 223.15"
            />
          </svg>
          <div className="lm-container">
            <div className="lm-brand">
              <span className="lm-brand-dot" />
              Stadtwerke Lübeck · LüMobil
            </div>
            <h1>
              Wie können wir<br />
              helfen?
            </h1>
            <p className="lm-sub">
              Antworten rund um Verbindungssuche, Abfahrten, Deutschlandticket, Konto und mehr —
              durchsuchen Sie Hilfeartikel und häufige Fragen.
            </p>
            <Suspense fallback={<div className="lm-hero-search" />}>
              <HeroSearch />
            </Suspense>
            <div className="lm-pop-wrap">
              <span className="lm-pop-label">Beliebt</span>
              <Link className="lm-pop" href="/suche?q=Deutschlandticket">
                Deutschlandticket
              </Link>
              <Link className="lm-pop" href="/suche?q=Verbindung">
                Verbindung suchen
              </Link>
              <Link className="lm-pop" href="/suche?q=Favoriten">
                Favoriten
              </Link>
              <Link className="lm-pop" href="/suche?q=Ticket">
                Ticket kaufen
              </Link>
              <Link className="lm-pop" href="/suche?q=Konto">
                Konto
              </Link>
            </div>
            <Link href="/ausblick" className="lm-version-link">
              Das ist Version 1 — Ausblick auf Version 2 ansehen →
            </Link>
          </div>
        </header>
        <div className="lm-container">
          <Suspense fallback={<div className="lm-tabbar" />}>
            <TabNav />
          </Suspense>
        </div>
        <main className="lm-main lm-container">{children}</main>
        <footer className="lm-container lm-footer">
          <span>Stand: Juli 2026</span>
          <span>
            LüMobil — Stadtwerke Lübeck Digital GmbH · Geniner Straße 80, 23560 Lübeck ·{' '}
            <a href="mailto:mobil@swhl.de">mobil@swhl.de</a>
          </span>
        </footer>
      </body>
    </html>
  )
}
