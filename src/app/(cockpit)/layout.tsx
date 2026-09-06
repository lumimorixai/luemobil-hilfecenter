import type { Metadata } from 'next'
import React from 'react'
import '@fontsource-variable/inter'
import '../(frontend)/globals.css'
import './cockpit.css'

export const metadata: Metadata = {
  title: 'Migrations-Cockpit · LüMobil',
  description: 'Interner Support-Bereich zur Begleitung der Kunden-Migration.',
  robots: { index: false, follow: false },
}

export default function CockpitLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <div className="lm-topbar" aria-hidden="true" />
        {children}
      </body>
    </html>
  )
}
