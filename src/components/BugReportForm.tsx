'use client'

import React, { useRef, useState, useTransition } from 'react'
import { submitBugReport } from '@/app/(frontend)/fehler/actions'

export function BugReportForm() {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await submitBugReport(formData)
      if (result.ok) {
        setDone(true)
        formRef.current?.reset()
      } else {
        setError(result.error)
      }
    })
  }

  if (done) {
    return (
      <div className="lm-report-toolbar">
        <div className="lm-report-success" role="status">
          <strong>Vielen Dank!</strong> Ihre Meldung wurde übermittelt und wird vom LüMobil-Team
          geprüft.{' '}
          <button
            type="button"
            className="lm-linkbtn"
            onClick={() => {
              setDone(false)
              setOpen(false)
            }}
          >
            Weitere Meldung erfassen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="lm-report-toolbar">
      {!open ? (
        <div className="lm-report-bar">
          <button type="button" className="lm-btn-primary" onClick={() => setOpen(true)}>
            ＋ Fehler melden
          </button>
          <span className="lm-report-hint">Ohne Anmeldung · Screenshots möglich</span>
        </div>
      ) : (
        <form ref={formRef} className="lm-report-form" onSubmit={onSubmit}>
          <div className="lm-report-head">
            <h3>Fehler melden</h3>
            <p>Ihre Meldung geht direkt an das LüMobil-Team und wird dort geprüft.</p>
          </div>

          {/* Honeypot — für Menschen unsichtbar, bitte leer lassen */}
          <div className="lm-hp" aria-hidden="true">
            <label>
              Website
              <input type="text" name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          <label className="lm-field-label">
            Titel *
            <input
              className="lm-field"
              type="text"
              name="title"
              required
              maxLength={200}
              placeholder="Kurze, prägnante Beschreibung"
            />
          </label>

          <label className="lm-field-label">
            Schweregrad
            <select className="lm-field" name="severity" defaultValue="mittel">
              <option value="hoch">Hoch</option>
              <option value="mittel">Mittel</option>
              <option value="niedrig">Niedrig</option>
            </select>
          </label>

          <label className="lm-field-label">
            Beschreibung *
            <textarea
              className="lm-field"
              name="description"
              rows={4}
              required
              maxLength={5000}
              placeholder="Was ist passiert?"
            />
          </label>

          <label className="lm-field-label">
            Schritte zur Reproduktion
            <textarea
              className="lm-field"
              name="steps"
              rows={4}
              maxLength={5000}
              placeholder={'Eine Zeile pro Schritt.'}
            />
          </label>

          <div className="lm-report-cols">
            <label className="lm-field-label">
              Erwartetes Verhalten
              <textarea className="lm-field" name="expected" rows={2} maxLength={2000} />
            </label>
            <label className="lm-field-label">
              Tatsächliches Verhalten
              <textarea className="lm-field" name="actual" rows={2} maxLength={2000} />
            </label>
          </div>

          <label className="lm-field-label">
            Melder:in
            <input
              className="lm-field"
              type="text"
              name="reporter"
              maxLength={120}
              placeholder="Name oder Abteilung (optional)"
            />
          </label>

          <label className="lm-field-label">
            Screenshots (optional, max. 3 × 4 MB, JPG/PNG/WebP)
            <input className="lm-field" type="file" name="images" accept="image/jpeg,image/png,image/webp" multiple />
          </label>

          {error && (
            <div className="lm-report-error" role="alert">
              {error}
            </div>
          )}

          <div className="lm-report-actions">
            <button type="submit" className="lm-btn-primary" disabled={pending}>
              {pending ? 'Wird gesendet …' : 'Meldung absenden'}
            </button>
            <button
              type="button"
              className="lm-tab"
              onClick={() => {
                setOpen(false)
                setError(null)
              }}
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
