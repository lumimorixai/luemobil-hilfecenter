import React from 'react'
import { getOpenQuestionGroups } from '@/lib/content'
import { OpenQuestionsSearch } from '@/components/OpenQuestionsSearch'

export const dynamic = 'force-dynamic'

export default async function OpenQuestionsPage() {
  const groups = await getOpenQuestionGroups()
  return (
    <div>
      <h2 className="lm-section-title" style={{ marginTop: 0 }}>
        Offene Fragen
      </h2>
      <p style={{ maxWidth: 640, fontSize: 15, lineHeight: 1.6, color: '#3F3B3B' }}>
        Organisatorische und fachliche Fragen rund um LüMobil — mit aktuellem Klärungsstand.
      </p>
      <OpenQuestionsSearch groups={groups} />
    </div>
  )
}
