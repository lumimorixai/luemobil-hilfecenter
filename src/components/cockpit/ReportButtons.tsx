'use client'

/**
 * Manueller Report-Versand aus dem Cockpit: pro Zeitraum ein Button, der den
 * Sofortversand (HTML-Mail + PDF-Anhang) an ALERT_EMAIL anstößt. Zeigt je Button
 * einen kurzen Status (sendet … / versendet / Fehler).
 */
import { useState } from 'react'

type Period = 'hour' | 'day' | 'week' | 'month'
type Status = 'idle' | 'sending' | 'sent' | 'error' | 'noaddr'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'hour', label: 'Stunde' },
  { key: 'day', label: 'Tag' },
  { key: 'week', label: 'Woche' },
  { key: 'month', label: 'Monat' },
]

const STATUS_TEXT: Record<Status, string> = {
  idle: '',
  sending: 'sendet …',
  sent: 'versendet ✓',
  error: 'Fehler',
  noaddr: 'keine Adresse',
}

export function ReportButtons() {
  const [status, setStatus] = useState<Record<Period, Status>>({
    hour: 'idle',
    day: 'idle',
    week: 'idle',
    month: 'idle',
  })

  async function send(period: Period) {
    setStatus((s) => ({ ...s, [period]: 'sending' }))
    try {
      const res = await fetch('/api/cockpit/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      })
      const data = await res.json().catch(() => ({}))
      let next: Status = 'error'
      if (res.ok && data.ok) next = 'sent'
      else if (res.ok && data.ok === false) next = 'noaddr'
      setStatus((s) => ({ ...s, [period]: next }))
    } catch {
      setStatus((s) => ({ ...s, [period]: 'error' }))
    }
    setTimeout(() => setStatus((s) => ({ ...s, [period]: 'idle' })), 6000)
  }

  return (
    <div className="cx-card">
      <div className="cx-card-head">
        <div>
          <h3 className="cx-card-h">Report versenden</h3>
          <div className="cx-card-hint">
            Grafischer Report (HTML-Mail + PDF-Anhang) an die hinterlegte Alert-Adresse — sofort.
          </div>
        </div>
      </div>
      <div className="cx-reportbtns">
        {PERIODS.map((p) => {
          const st = status[p.key]
          return (
            <button
              key={p.key}
              type="button"
              className={`cx-reportbtn${st === 'sent' ? ' ok' : st === 'error' || st === 'noaddr' ? ' err' : ''}`}
              disabled={st === 'sending'}
              onClick={() => send(p.key)}
            >
              <span className="cx-reportbtn-l">{p.label}</span>
              <span className="cx-reportbtn-s">{st === 'idle' ? 'jetzt senden' : STATUS_TEXT[st]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
