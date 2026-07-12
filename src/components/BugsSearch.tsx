'use client'

import React, { useMemo, useState } from 'react'
import type { BugData } from '@/lib/content'
import { highlight, LocalSearch } from '@/components/search-ui'

export function BugsSearch({ bugs }: { bugs: BugData[] }) {
  const [term, setTerm] = useState('')
  const q = term.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!q) return bugs
    return bugs.filter((b) =>
      [b.bugId, b.title, b.description, b.fundort, b.expected, b.actual, ...b.steps]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [bugs, q])

  return (
    <div>
      <LocalSearch value={term} onChange={setTerm} placeholder="In bekannten Fehlern suchen …" />
      {filtered.length === 0 ? (
        <div className="lm-empty">Keine passenden Fehler gefunden.</div>
      ) : (
        filtered.map((bug) => (
          <section key={bug.bugId} className="lm-bug">
            <div className="lm-bug-head">
              <span className={`lm-badge ${bug.severity}`}>{bug.severity}</span>
              <span className="lm-bug-id">{bug.bugId}</span>
              <h3>{highlight(bug.title, term.trim())}</h3>
            </div>
            {bug.fundort && <div className="fundort">Fundort: {highlight(bug.fundort, term.trim())}</div>}
            {bug.description && <p>{highlight(bug.description, term.trim())}</p>}
            {bug.steps.length > 0 && (
              <>
                <div className="lm-label">Schritte zur Reproduktion</div>
                <ol className="lm-steps">
                  {bug.steps.map((s, i) => (
                    <li key={i}>{highlight(s, term.trim())}</li>
                  ))}
                </ol>
              </>
            )}
            {(bug.expected || bug.actual) && (
              <div className="lm-bug-cols">
                {bug.expected && (
                  <div>
                    <div className="lm-label">Erwartet</div>
                    <p>{highlight(bug.expected, term.trim())}</p>
                  </div>
                )}
                {bug.actual && (
                  <div>
                    <div className="lm-label">Tatsächlich</div>
                    <p>{highlight(bug.actual, term.trim())}</p>
                  </div>
                )}
              </div>
            )}
            {bug.images.length > 0 && (
              <div className="lm-bug-imgs">
                {bug.images.map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={img.url} alt={img.alt} loading="lazy" />
                ))}
              </div>
            )}
            {bug.caption && <div className="lm-caption">{bug.caption}</div>}
            {bug.images.length === 0 && bug.noImageNote && (
              <div className="lm-caption">{bug.noImageNote}</div>
            )}
          </section>
        ))
      )}
    </div>
  )
}
