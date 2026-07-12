import React from 'react'
import { payloadClient } from '@/lib/content'

export const dynamic = 'force-dynamic'

export default async function ManualPage() {
  const payload = await payloadClient()
  const res = await payload.find({
    collection: 'manual-chapters',
    limit: 100,
    sort: 'order',
    depth: 1,
  })

  return (
    <div>
      <h2 className="lm-section-title" style={{ marginTop: 0 }}>
        App-Handbuch
      </h2>
      <p style={{ maxWidth: 640, fontSize: 15, lineHeight: 1.6, color: '#3F3B3B' }}>
        Schritt für Schritt durch alle Bereiche der LüMobil-App — vom ersten Start bis zu den
        Einstellungen.
      </p>
      {res.docs.map((ch) => {
        const images = (ch.images ?? []).filter(
          (img): img is Exclude<typeof img, number> => typeof img === 'object' && img !== null,
        )
        return (
          <section key={ch.slug} className={`lm-chapter${ch.reverse ? ' reverse' : ''}`}>
            <div className="txt">
              {ch.num && <div className="num">{ch.num}</div>}
              <h2>{ch.title}</h2>
              {(ch.paras ?? []).map((p, i) => (
                <p key={i}>{p.text}</p>
              ))}
              {ch.bullets && ch.bullets.length > 0 && (
                <ul>
                  {ch.bullets.map((b, i) => (
                    <li key={i} style={{ fontSize: 14.5, lineHeight: 1.65, color: '#3F3B3B' }}>
                      {b.text}
                    </li>
                  ))}
                </ul>
              )}
              {ch.note && <div className="lm-note">{ch.note}</div>}
            </div>
            {images.length > 0 && (
              <div className="imgs">
                {images.map(
                  (img) =>
                    img.url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={img.id} src={img.url} alt={img.alt ?? ch.title} loading="lazy" />
                    ),
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
