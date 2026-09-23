'use client'

/**
 * Metabase-Dashboard im iframe. Das Token in der URL gilt 10 Minuten. Eine
 * offene Seite lädt von sich aus keine Daten nach, deshalb wird das iframe
 * NICHT im Takt neu geladen (das würde sichtbar flackern) — sondern nur, wenn
 * man zur Seite zurückkehrt und die Anzeige älter als 9 Minuten ist.
 *
 * Höhe: Metabase skaliert die Kacheln mit der Breite. Die Höhe wird deshalb
 * aus der tatsächlichen iframe-Breite berechnet (gemessene Werte je Dashboard),
 * statt ein Skript von Metabase in die eigene Seite zu laden.
 */
import { useEffect, useRef, useState } from 'react'
import type { DashboardSizing } from '@/lib/metabase'

/**
 * Ab diesem Alter wird beim Zurückkehren auf die Seite eine frische URL geholt.
 * Kürzer als die Token-Gültigkeit (10 min), damit das neue Token sicher gilt.
 */
const MAX_AGE_MS = 9 * 60 * 1000
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
  const loadedAt = useRef(Date.now())
  const [height, setHeight] = useState(() => heightFor(1200, sizing))

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    // Nur bei spürbarer Änderung neu setzen: Jede Größenänderung lässt Metabase
    // die Kacheln neu zeichnen (sichtbares Zucken beim Ziehen des Fensters).
    const update = () =>
      setHeight((prev) => {
        const next = heightFor(el.clientWidth, sizing)
        return Math.abs(next - prev) >= 8 ? next : prev
      })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [sizing])

  // Kein Nachladen im Takt: Ein offenes Dashboard lädt von sich aus keine Daten
  // nach, ein abgelaufenes Token stört es also nicht. Stattdessen wird beim
  // Zurückkehren auf die Seite aufgefrischt — so flackert nichts beim Zuschauen.
  useEffect(() => {
    setUrl(initialUrl)
    setExpired(false)
    loadedAt.current = Date.now()

    let running = false
    async function refreshIfStale() {
      if (running || document.hidden || Date.now() - loadedAt.current < MAX_AGE_MS) return
      running = true
      try {
        const res = await fetch(`/api/cockpit/kennzahlen?dashboard=${encodeURIComponent(dashboardKey)}`, {
          credentials: 'same-origin',
          cache: 'no-store',
        })
        if (res.ok) {
          setUrl(((await res.json()) as { url: string }).url)
          loadedAt.current = Date.now()
          setExpired(false)
        } else {
          // Abgemeldet oder Rechte entzogen: kein neues Token mehr.
          setExpired(true)
        }
      } catch {
        // Netzwerkfehler: beim nächsten Zurückkehren erneut versuchen.
      } finally {
        running = false
      }
    }

    document.addEventListener('visibilitychange', refreshIfStale)
    window.addEventListener('focus', refreshIfStale)
    return () => {
      document.removeEventListener('visibilitychange', refreshIfStale)
      window.removeEventListener('focus', refreshIfStale)
    }
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
