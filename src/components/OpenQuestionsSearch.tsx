'use client'

import React, { useMemo, useState } from 'react'
import type { OpenQuestionGroup } from '@/lib/content'
import { highlight, LocalSearch } from '@/components/search-ui'

export function OpenQuestionsSearch({ groups }: { groups: OpenQuestionGroup[] }) {
  const [term, setTerm] = useState('')
  const q = term.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!q) return groups
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((i) =>
          [i.question, i.answer, i.note, i.qid, g.group].join(' ').toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0)
  }, [groups, q])

  return (
    <div>
      <LocalSearch value={term} onChange={setTerm} placeholder="In offenen Fragen suchen …" />
      {filtered.length === 0 ? (
        <div className="lm-empty">Keine passenden Fragen gefunden.</div>
      ) : (
        filtered.map((g) => (
          <div key={g.group} style={{ marginBottom: 30 }}>
            <p className="lm-kicker">{g.group}</p>
            {g.items.map((item) => (
              <div key={item.qid} className="lm-question">
                <span className={`lm-badge ${item.status}`}>{item.status}</span>{' '}
                <span className="lm-bug-id">{item.qid}</span>
                <div className="q">{highlight(item.question, term.trim())}</div>
                {item.answer && <div className="a">{highlight(item.answer, term.trim())}</div>}
                {item.note && <div className="lm-caption">{highlight(item.note, term.trim())}</div>}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}
