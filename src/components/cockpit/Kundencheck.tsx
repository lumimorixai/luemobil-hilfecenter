'use client'

/**
 * Kundencheck: E-Mail eingeben → Keycloak-Status + letzte Ereignisse + Verdikt.
 * Ruft /api/cockpit/check (nur Support-Rolle, serverseitig). Zustände:
 * Ruhe, Laden, Ergebnis, Fehler (403 / Rate-Limit / Störung).
 *
 * Statusfarben (grün/gelb/pink) sind hier zulässig — sie zeigen einen Status,
 * keine Dekoration und keine Diagrammserie (SWL-Design-System).
 * (Aboonline-Prüfung derzeit deaktiviert — Endpoint noch nicht verfügbar.)
 */
import { useState, type FormEvent } from 'react'
import type { Diagnosis } from '@/lib/cockpit/types'
import './kundencheck.css'

export function Kundencheck() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Diagnosis | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(value: string) {
    const q = value.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/cockpit/check?email=${encodeURIComponent(q)}`, {
        headers: { Accept: 'application/json' },
      })
      if (res.status === 403) {
        setError('Keine Berechtigung für den Kundencheck.')
        return
      }
      if (res.status === 429) {
        setError('Zu viele Abfragen in kurzer Zeit. Bitte einen Moment warten.')
        return
      }
      if (res.status === 400) {
        setError('Bitte eine gültige E-Mail-Adresse eingeben.')
        return
      }
      if (!res.ok) {
        setError('Die Prüfung ist derzeit nicht möglich. Bitte später erneut versuchen.')
        return
      }
      setResult((await res.json()) as Diagnosis)
    } catch {
      setError('Verbindungsfehler. Bitte später erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    run(email)
  }

  return (
    <section className="cx-check">
      <h2 className="cx-check-title">Kundencheck</h2>
      <p className="cx-check-sub">
        Prüft, ob zu einer E-Mail-Adresse ein Konto in Keycloak vorhanden ist, zeigt die letzten
        Ereignisse – und was dem Kunden konkret zu sagen ist.
      </p>

      <form className="cx-searchrow" onSubmit={onSubmit}>
        <input
          type="email"
          className="cx-input"
          placeholder="kunde@example.de"
          aria-label="E-Mail-Adresse prüfen"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="cx-btn" disabled={loading}>
          {loading ? 'Prüfe …' : 'Prüfen'}
        </button>
      </form>

      {error && <div className="cx-verdict cx-verdict--no">{error}</div>}

      {result && !error && (
        <div className="cx-pipeline">
          <div className="cx-check-cols">
            <div className="cx-step">
              <div className="cx-step-who">Keycloak-Konto</div>
              <div className="cx-step-state">
                <span className={`cx-dot cx-dot--${result.keycloak.state}`} />
                <span>{result.keycloak.label}</span>
              </div>
              <div className="cx-step-detail">{result.keycloak.detail}</div>
            </div>

            <div className="cx-step">
              <div className="cx-step-who">Letzte Ereignisse (max. 10)</div>
              {result.events.length === 0 ? (
                <div className="cx-ev-empty">Keine Ereignisse registriert</div>
              ) : (
                <ul className="cx-evlist">
                  {result.events.map((ev, i) => (
                    <li className="cx-ev" key={i}>
                      <span className="cx-ev-time">{ev.time}</span>
                      <span className={`cx-dot cx-dot--${ev.kind}`} />
                      <span className="cx-ev-label">{ev.label}</span>
                      {ev.clientId && <span className="cx-ev-client">{ev.clientId}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className={`cx-verdict cx-verdict--${result.verdict.kind}`}>{result.verdict.text}</div>
        </div>
      )}
    </section>
  )
}
