'use client'

import Link from 'next/link'
import React, { useMemo, useState } from 'react'
import type { ArticleCard, FaqGroup } from '@/lib/content'

function highlight(text: string, term: string): React.ReactNode {
  if (!term) return text
  const idx = text.toLowerCase().indexOf(term.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + term.length)}</mark>
      {text.slice(idx + term.length)}
    </>
  )
}

function FaqEntry({ q, a, term }: { q: string; a: string; term: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="lm-faq">
      <button
        type="button"
        className="lm-faq-q"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{highlight(q, term)}</span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="lm-faq-a">{highlight(a, term)}</div>}
    </div>
  )
}

export function HelpCenter({
  articles,
  faqGroups,
}: {
  articles: ArticleCard[]
  faqGroups: FaqGroup[]
}) {
  const [term, setTerm] = useState('')
  const [category, setCategory] = useState<string | null>(null)

  const categories = useMemo(
    () => Array.from(new Set(articles.map((a) => a.category))),
    [articles],
  )

  const q = term.trim().toLowerCase()

  const filteredArticles = useMemo(
    () =>
      articles.filter((a) => {
        if (category && a.category !== category) return false
        if (!q) return true
        return (
          a.title.toLowerCase().includes(q) ||
          a.excerpt.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
        )
      }),
    [articles, category, q],
  )

  const filteredFaq = useMemo(
    () =>
      faqGroups
        .map((g) => ({
          ...g,
          items: q
            ? g.items.filter(
                (i) => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q),
              )
            : g.items,
        }))
        .filter((g) => g.items.length > 0),
    [faqGroups, q],
  )

  return (
    <div>
      <div className="lm-search-wrap" style={{ marginBottom: 26 }}>
        <span className="lm-search-icon">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7A7474"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.5" y2="16.5" />
          </svg>
        </span>
        <input
          className="lm-search"
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Frage oder Stichwort eingeben, z. B. „Deutschlandticket“ …"
          autoComplete="off"
          aria-label="Hilfe durchsuchen"
        />
      </div>

      <p className="lm-kicker">Themen</p>
      <div className="lm-chips">
        <button
          type="button"
          className={`lm-chip${category === null ? ' active' : ''}`}
          onClick={() => setCategory(null)}
        >
          Alle
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`lm-chip${category === c ? ' active' : ''}`}
            onClick={() => setCategory(category === c ? null : c)}
          >
            {c}
          </button>
        ))}
      </div>

      <h2 className="lm-section-title">Hilfeartikel</h2>
      {filteredArticles.length === 0 ? (
        <div className="lm-empty">Keine Artikel gefunden. Versuchen Sie ein anderes Stichwort.</div>
      ) : (
        <div className="lm-grid">
          {filteredArticles.map((a) => (
            <Link key={a.slug} href={`/artikel/${a.slug}`} className="lm-card">
              <div className="cat">{a.category}</div>
              <h3>{highlight(a.title, term.trim())}</h3>
              <p>{highlight(a.excerpt, term.trim())}</p>
            </Link>
          ))}
        </div>
      )}

      <h2 className="lm-section-title">Häufige Fragen</h2>
      {filteredFaq.length === 0 ? (
        <div className="lm-empty">Keine passenden Fragen gefunden.</div>
      ) : (
        filteredFaq.map((g) => (
          <div key={g.group} className="lm-faq-group">
            <p className="lm-kicker">{g.group}</p>
            {g.items.map((i) => (
              <FaqEntry key={i.q} q={i.q} a={i.a} term={term.trim()} />
            ))}
          </div>
        ))
      )}
    </div>
  )
}
