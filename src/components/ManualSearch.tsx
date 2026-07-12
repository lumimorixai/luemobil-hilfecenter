'use client'

import React, { useMemo, useState } from 'react'
import type { ManualChapter } from '@/lib/content'
import { highlight, LocalSearch } from '@/components/search-ui'

export function ManualSearch({ chapters }: { chapters: ManualChapter[] }) {
  const [term, setTerm] = useState('')
  const q = term.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!q) return chapters
    return chapters.filter((ch) =>
      [ch.title, ch.num, ch.note, ...ch.paras, ...ch.bullets]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [chapters, q])

  return (
    <div>
      <LocalSearch value={term} onChange={setTerm} placeholder="Im Handbuch suchen …" />
      {filtered.length === 0 ? (
        <div className="lm-empty">Keine Kapitel gefunden. Versuchen Sie ein anderes Stichwort.</div>
      ) : (
        filtered.map((ch) => (
          <section key={ch.slug} className={`lm-chapter${ch.reverse ? ' reverse' : ''}`}>
            <div className="txt">
              {ch.num && <div className="num">{highlight(ch.num, term.trim())}</div>}
              <h2>{highlight(ch.title, term.trim())}</h2>
              {ch.paras.map((p, i) => (
                <p key={i}>{highlight(p, term.trim())}</p>
              ))}
              {ch.bullets.length > 0 && (
                <ul>
                  {ch.bullets.map((b, i) => (
                    <li key={i} style={{ fontSize: 14.5, lineHeight: 1.65, color: '#3F3B3B' }}>
                      {highlight(b, term.trim())}
                    </li>
                  ))}
                </ul>
              )}
              {ch.note && <div className="lm-note">{highlight(ch.note, term.trim())}</div>}
            </div>
            {ch.images.length > 0 && (
              <div className="imgs">
                {ch.images.map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={img.url} alt={img.alt} loading="lazy" />
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  )
}
