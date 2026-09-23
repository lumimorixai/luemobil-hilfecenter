'use client'

/**
 * Metabase-Dashboard im iframe. Das Token in der URL gilt 10 Minuten; damit
 * eine offene Seite weiter funktioniert, holt die Komponente alle 9 Minuten
 * eine frische URL vom Server (gleiche Rechteprüfung wie die Seite).
 *
 * Höhe: Metabase skaliert die Kacheln mit der Breite. Die Höhe wird deshalb
 * aus der tatsächlichen iframe-Breite berechnet (gemessene Werte je Dashboard),
 * statt ein Skript von Metabase in die eigene Seite zu laden.
 */
import { useEffect, useRef, useState } from 'react'
import type { DashboardSizing } from '@/lib/metabase'

const REFRESH_MS = 9 * 60 * 1000
/** Unter dem Raster: Rand und „Powered by Metabase" (gemessen). */
const FOOTER_PX = 80

function heightFor(width: number, { base, slope }: DashboardSizing): number {
  return Math.round(base + Math.max(0, width - 1200) * slope + FOOTER_PX)
}

export function DashboardFrame({
  dashboardKey,
  title,
  initialUrl,
  sizing,
}: {
  dashboardKey: string
  title: string
  initialUrl: string
  sizing: DashboardSizing
}) {
  const [url, setUrl] = useState(initialUrl)
  const [expired, setExpired] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(() => heightFor(1200, sizing))

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const update = () => setHeight(heightFor(el.clientWidth, sizing))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [sizing])

  useEffect(() => {
    setUrl(initialUrl)
    setExpired(false)
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/cockpit/kennzahlen?dashboard=${encodeURIComponent(dashboardKey)}`, {
          credentials: 'same-origin',
          cache: 'no-store',
        })
        if (res.ok) {
          setUrl(((await res.json()) as { url: string }).url)
          setExpired(false)
        } else {
          // Abgemeldet oder Rechte entzogen: kein neues Token mehr.
          setExpired(true)
          clearInterval(timer)
        }
      } catch {
        // Netzwerkfehler: beim nächsten Intervall erneut versuchen.
      }
    }, REFRESH_MS)
    return () => clearInterval(timer)
  }, [dashboardKey, initialUrl])

  return (
    <>
      {expired && (
        <div className="lm-short lm-dash-note">
          Die Anzeige konnte nicht verlängert werden. Bitte die Seite neu laden oder sich erneut
          anmelden.
        </div>
      )}
      <iframe
        ref={frameRef}
        className="lm-dash-frame"
        src={url}
        title={`LüMobil – ${title}`}
        width="100%"
        height={height}
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    </>
  )
}
