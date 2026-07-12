import React from 'react'
import { payloadClient } from '@/lib/content'

export const dynamic = 'force-dynamic'

export default async function OpenQuestionsPage() {
  const payload = await payloadClient()
  const res = await payload.find({
    collection: 'open-questions',
    limit: 100,
    sort: 'order',
    depth: 0,
  })

  return (
    <div>
      <h2 className="lm-section-title" style={{ marginTop: 0 }}>
        Offene Fragen
      </h2>
      <p style={{ maxWidth: 640, fontSize: 15, lineHeight: 1.6, color: '#3F3B3B' }}>
        Organisatorische und fachliche Fragen rund um LüMobil — mit aktuellem Klärungsstand.
      </p>
      {res.docs.map((g) => (
        <div key={g.group} style={{ marginBottom: 30 }}>
          <p className="lm-kicker">{g.group}</p>
          {(g.items ?? []).map((item) => (
            <div key={item.qid} className="lm-question">
              <span className={`lm-badge ${item.status}`}>{item.status}</span>{' '}
              <span className="lm-bug-id">{item.qid}</span>
              <div className="q">{item.question}</div>
              {item.answer && <div className="a">{item.answer}</div>}
              {item.note && <div className="lm-caption">{item.note}</div>}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
