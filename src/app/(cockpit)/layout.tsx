import type { Metadata } from 'next'
import React from 'react'
import '@fontsource-variable/inter'
import '../(frontend)/globals.css'
import './cockpit.css'
import { ThemeVorabSkript } from '@/components/cockpit/ThemeSchalter'

export const metadata: Metadata = {
  title: 'Migrations-Cockpit · LüMobil',
  description: 'Interner Support-Bereich zur Begleitung der Kunden-Migration.',
  robots: { index: false, follow: false },
}

export default function CockpitLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        {/* Setzt die gespeicherte Wahl, bevor gezeichnet wird — sonst blitzt
            die helle Fassung auf, wenn jemand dunkel gewählt hat. */}
        <ThemeVorabSkript />
      </head>
      <body>
        <div className="lm-topbar" aria-hidden="true" />
        {children}
      </body>
    </html>
  )
}
