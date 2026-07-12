import React from 'react'
import { getManualChapters } from '@/lib/content'
import { ManualSearch } from '@/components/ManualSearch'

export const dynamic = 'force-dynamic'

export default async function ManualPage() {
  const chapters = await getManualChapters()
  return (
    <div>
      <h2 className="lm-section-title" style={{ marginTop: 0 }}>
        LüMobil Handbuch
      </h2>
      <p style={{ maxWidth: 640, fontSize: 15, lineHeight: 1.6, color: '#3F3B3B' }}>
        Schritt für Schritt durch alle Bereiche der LüMobil-App — vom ersten Start bis zu den
        Einstellungen.
      </p>
      <ManualSearch chapters={chapters} />
    </div>
  )
}
