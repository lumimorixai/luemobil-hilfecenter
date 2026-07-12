import { notFound } from 'next/navigation'
import Link from 'next/link'
import React from 'react'
import { payloadClient } from '@/lib/content'

export const dynamic = 'force-dynamic'

type Args = { params: Promise<{ slug: string }> }

export default async function ArticlePage({ params }: Args) {
  const { slug } = await params
  const payload = await payloadClient()

  const res = await payload.find({
    collection: 'articles',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  })
  const article = res.docs[0]
  if (!article) notFound()

  const related = (article.related ?? []).filter(
    (r): r is Exclude<typeof r, number> => typeof r === 'object' && r !== null,
  )

  return (
    <article className="lm-article">
      <p className="lm-kicker">{article.category}</p>
      <h1>{article.title}</h1>
      {article.meta && <p className="lm-meta">{article.meta}</p>}

      {article.short && <div className="lm-short">{article.short}</div>}

      {article.steps && article.steps.length > 0 && (
        <>
          <h2 className="lm-h2">Schritt für Schritt</h2>
          <ol className="lm-steps">
            {article.steps.map((s, i) => (
              <li key={i}>{s.text}</li>
            ))}
          </ol>
        </>
      )}

      {article.stepGroups &&
        article.stepGroups.map((g, i) => (
          <React.Fragment key={i}>
            <h2 className="lm-h2">{g.heading}</h2>
            <ol className="lm-steps">
              {(g.items ?? []).map((s, j) => (
                <li key={j}>{s.text}</li>
              ))}
            </ol>
          </React.Fragment>
        ))}

      {article.tips && article.tips.length > 0 && (
        <>
          <h2 className="lm-h2">Tipps</h2>
          <div className="lm-tipbox">
            <ul>
              {article.tips.map((t, i) => (
                <li key={i}>{t.text}</li>
              ))}
            </ul>
          </div>
        </>
      )}

      {related.length > 0 && (
        <>
          <h2 className="lm-h2">Verwandte Artikel</h2>
          <div>
            {related.map((r) => (
              <Link key={r.slug} href={`/artikel/${r.slug}`} className="lm-mini">
                {r.title}
              </Link>
            ))}
          </div>
        </>
      )}

      <p style={{ marginTop: 34 }}>
        <Link href="/">← Zurück zum Hilfe-Center</Link>
      </p>
    </article>
  )
}
