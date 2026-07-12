import React from 'react'
import { getBugs } from '@/lib/content'
import { BugReportForm } from '@/components/BugReportForm'
import { BugsSearch } from '@/components/BugsSearch'

export const dynamic = 'force-dynamic'

export default async function BugsPage() {
  const bugs = await getBugs()
  return (
    <div>
      <h2 className="lm-section-title" style={{ marginTop: 0 }}>
        Bekannte Fehler
      </h2>
      <p style={{ maxWidth: 640, fontSize: 15, lineHeight: 1.6, color: '#3F3B3B' }}>
        Transparent dokumentiert: Diese Punkte sind bekannt und werden bearbeitet. Sortiert nach
        Schweregrad.
      </p>
      <BugReportForm />
      <BugsSearch bugs={bugs} />
    </div>
  )
}
