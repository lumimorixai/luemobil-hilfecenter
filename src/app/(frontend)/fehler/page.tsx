import React from 'react'
import { payloadClient } from '@/lib/content'
import { BugReportForm } from '@/components/BugReportForm'

export const dynamic = 'force-dynamic'

const ORDER: Record<string, number> = { hoch: 0, mittel: 1, niedrig: 2 }

export default async function BugsPage() {
  const payload = await payloadClient()
  const res = await payload.find({
    collection: 'known-bugs',
    limit: 200,
    depth: 1,
  })
  const bugs = [...res.docs].sort(
    (a, b) => (ORDER[a.severity] ?? 9) - (ORDER[b.severity] ?? 9) || a.bugId.localeCompare(b.bugId),
  )

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
      {bugs.map((bug) => {
        const images = (bug.images ?? []).filter(
          (img): img is Exclude<typeof img, number> => typeof img === 'object' && img !== null,
        )
        return (
          <section key={bug.bugId} className="lm-bug">
            <div className="lm-bug-head">
              <span className={`lm-badge ${bug.severity}`}>{bug.severity}</span>
              <span className="lm-bug-id">{bug.bugId}</span>
              <h3>{bug.title}</h3>
            </div>
            {bug.fundort && <div className="fundort">Fundort: {bug.fundort}</div>}
            {bug.description && <p>{bug.description}</p>}
            {bug.steps && bug.steps.length > 0 && (
              <>
                <div className="lm-label">Schritte zur Reproduktion</div>
                <ol className="lm-steps">
                  {bug.steps.map((s, i) => (
                    <li key={i}>{s.text}</li>
                  ))}
                </ol>
              </>
            )}
            {(bug.expected || bug.actual) && (
              <div className="lm-bug-cols">
                {bug.expected && (
                  <div>
                    <div className="lm-label">Erwartet</div>
                    <p>{bug.expected}</p>
                  </div>
                )}
                {bug.actual && (
                  <div>
                    <div className="lm-label">Tatsächlich</div>
                    <p>{bug.actual}</p>
                  </div>
                )}
              </div>
            )}
            {images.length > 0 && (
              <div className="lm-bug-imgs">
                {images.map(
                  (img) =>
                    img.url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={img.id} src={img.url} alt={img.alt ?? bug.title} loading="lazy" />
                    ),
                )}
              </div>
            )}
            {bug.caption && <div className="lm-caption">{bug.caption}</div>}
            {images.length === 0 && bug.noImageNote && (
              <div className="lm-caption">{bug.noImageNote}</div>
            )}
          </section>
        )
      })}
    </div>
  )
}
