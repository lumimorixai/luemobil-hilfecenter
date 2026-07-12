import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'
import {
  getArticles,
  getFaqGroups,
  getManualChapters,
  getBugs,
  getOpenQuestionGroups,
} from '@/lib/content'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Suche · LüMobil Hilfecenter',
}

type Hit = { title: string; snippet: string; href: string; badge: string }

function contains(haystack: string, q: string): boolean {
  return haystack.toLowerCase().includes(q)
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q: rawQ } = await searchParams
  const q = (rawQ ?? '').trim()
  const ql = q.toLowerCase()

  let groups: { label: string; hits: Hit[] }[] = []

  if (q) {
    const [articles, faqGroups, chapters, bugs, openGroups] = await Promise.all([
      getArticles(),
      getFaqGroups(),
      getManualChapters(),
      getBugs(),
      getOpenQuestionGroups(),
    ])

    const articleHits: Hit[] = articles
      .filter((a) => contains(`${a.title} ${a.excerpt} ${a.category}`, ql))
      .map((a) => ({ title: a.title, snippet: a.excerpt, href: `/artikel/${a.slug}`, badge: a.category }))

    const faqHits: Hit[] = faqGroups.flatMap((g) =>
      g.items
        .filter((i) => contains(`${i.q} ${i.a}`, ql))
        .map((i) => ({ title: i.q, snippet: i.a, href: '/', badge: g.group })),
    )

    const manualHits: Hit[] = chapters
      .filter((ch) => contains([ch.title, ch.num, ch.note, ...ch.paras, ...ch.bullets].join(' '), ql))
      .map((ch) => ({
        title: ch.title,
        snippet: ch.paras[0] ?? '',
        href: '/handbuch',
        badge: ch.num || 'Handbuch',
      }))

    const bugHits: Hit[] = bugs
      .filter((b) =>
        contains([b.bugId, b.title, b.description, b.fundort, b.expected, b.actual, ...b.steps].join(' '), ql),
      )
      .map((b) => ({ title: b.title, snippet: b.description, href: '/fehler', badge: `${b.bugId} · ${b.severity}` }))

    const openHits: Hit[] = openGroups.flatMap((g) =>
      g.items
        .filter((i) => contains(`${i.question} ${i.answer} ${i.note} ${i.qid}`, ql))
        .map((i) => ({ title: i.question, snippet: i.answer, href: '/fragen', badge: `${g.group} · ${i.status}` })),
    )

    groups = [
      { label: 'Hilfeartikel', hits: articleHits },
      { label: 'Häufige Fragen', hits: faqHits },
      { label: 'LüMobil Handbuch', hits: manualHits },
      { label: 'Bekannte Fehler', hits: bugHits },
      { label: 'Offene Fragen', hits: openHits },
    ].filter((g) => g.hits.length > 0)
  }

  const total = groups.reduce((n, g) => n + g.hits.length, 0)

  return (
    <div>
      <h2 className="lm-section-title" style={{ marginTop: 0 }}>
        Suche
      </h2>

      {!q ? (
        <p style={{ fontSize: 15, color: '#3F3B3B' }}>
          Geben Sie oben rechts einen Suchbegriff ein, um das gesamte Hilfecenter zu durchsuchen —
          Hilfeartikel, häufige Fragen, App-Handbuch, bekannte Fehler und offene Fragen.
        </p>
      ) : (
        <p style={{ fontSize: 15, color: '#3F3B3B' }}>
          {total === 0 ? (
            <>
              Keine Treffer für <strong>„{q}“</strong>. Versuchen Sie ein anderes Stichwort.
            </>
          ) : (
            <>
              {total} {total === 1 ? 'Treffer' : 'Treffer'} für <strong>„{q}“</strong>
            </>
          )}
        </p>
      )}

      {groups.map((g) => (
        <div key={g.label} style={{ marginBottom: 26 }}>
          <p className="lm-kicker">
            {g.label} · {g.hits.length}
          </p>
          <div className="lm-grid">
            {g.hits.map((hit, i) => (
              <Link key={i} href={hit.href} className="lm-card">
                <div className="cat">{hit.badge}</div>
                <h3>{hit.title}</h3>
                {hit.snippet && <p>{hit.snippet}</p>}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
