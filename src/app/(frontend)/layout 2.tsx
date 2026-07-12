import type { Metadata } from 'next'
import React, { Suspense } from 'react'
import Image from 'next/image'
import { TabNav } from '@/components/TabNav'
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
        <header className="lm-header">
          <Image
            src="/swl-innovation-mark.png"
            alt="SWL Innovation"
            width={46}
            height={46}
            className="lm-mark"
          />
          <div className="lm-container">
            <div className="lm-brand">
              <span className="lm-brand-dot" />
              Stadtwerke Lübeck · LüMobil
            </div>
            <h1>Hilfe &amp; Service für LüMobil</h1>
            <p className="lm-sub">
              Durchsuchen Sie Hilfeartikel, das App-Handbuch, häufige Fragen und aktuelle
              Störungen — alles rund um Ihre Mobilitäts-App an einem Ort.
            </p>
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
