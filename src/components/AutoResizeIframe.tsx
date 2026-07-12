'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

/**
 * iframe, das seine Höhe an den Inhalt anpasst.
 * Funktioniert, weil der Inhalt über unseren eigenen Proxy von derselben
 * Origin geladen wird (sandbox mit allow-same-origin) — dadurch dürfen wir
 * die Inhaltshöhe auslesen. Da die Störungsdaten asynchron nachladen, messen
 * wir eine Weile lang nach.
 */
export function AutoResizeIframe({
  src,
  title,
  minHeight = 700,
  maxHeight = 4000,
}: {
  src: string
  title: string
  minHeight?: number
  maxHeight?: number
}) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(minHeight)

  const measure = useCallback(() => {
    const iframe = ref.current
    try {
      const doc = iframe?.contentWindow?.document
      if (!doc) return
      const h = Math.max(
        doc.body?.scrollHeight ?? 0,
        doc.documentElement?.scrollHeight ?? 0,
      )
      if (h > 0) setHeight(Math.min(maxHeight, Math.max(minHeight, h + 24)))
    } catch {
      // Cross-Origin o. Ä. — Mindesthöhe beibehalten
    }
  }, [minHeight, maxHeight])

  useEffect(() => {
    // Mehrfach nachmessen, während der Inhalt (asynchron) rendert
    const timers = [300, 800, 1500, 3000, 5000].map((t) => setTimeout(measure, t))
    const interval = setInterval(measure, 4000)
    window.addEventListener('resize', measure)
    return () => {
      timers.forEach(clearTimeout)
      clearInterval(interval)
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      loading="lazy"
      referrerPolicy="no-referrer"
      onLoad={measure}
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      style={{ display: 'block', width: '100%', height, border: 0 }}
    />
  )
}
