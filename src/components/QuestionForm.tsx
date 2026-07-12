'use client'

import React, { useRef, useState, useTransition } from 'react'
import { submitQuestion } from '@/app/(frontend)/fragen/actions'

export function QuestionForm() {
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
      const result = await submitQuestion(formData)
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
          <strong>Vielen Dank!</strong> Ihre Frage wurde übermittelt und wird vom LüMobil-Team
          geprüft.{' '}
          <button
            type="button"
            className="lm-linkbtn"
            onClick={() => {
              setDone(false)
              setOpen(false)
            }}
          >
            Weitere Frage stellen
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
            ＋ Frage stellen
          </button>
          <span className="lm-report-hint">Ohne Anmeldung · wird vom Team beantwortet</span>
        </div>
      ) : (
        <form ref={formRef} className="lm-report-form" onSubmit={onSubmit}>
          <div className="lm-report-head">
            <h3>Frage stellen</h3>
            <p>Ihre Frage geht direkt an das LüMobil-Team. Passende Fragen und Antworten
              veröffentlichen wir hier unter „Offene Fragen“.</p>
          </div>

          {/* Honeypot — für Menschen unsichtbar, bitte leer lassen */}
          <div className="lm-hp" aria-hidden="true">
            <label>
              Website
              <input type="text" name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          <label className="lm-field-label">
            Ihre Frage *
            <textarea
              className="lm-field"
              name="question"
              rows={4}
              required
              maxLength={2000}
              placeholder="Was möchten Sie zu LüMobil wissen?"
            />
          </label>

          <label className="lm-field-label">
            Eingereicht von
            <input
              className="lm-field"
              type="text"
              name="reporter"
              maxLength={120}
              placeholder="Name oder Abteilung (optional)"
            />
          </label>

          <label className="lm-field-label">
            Kontakt für Rückfragen
            <input
              className="lm-field"
              type="text"
              name="contact"
              maxLength={160}
              placeholder="E-Mail oder Telefon (optional)"
            />
          </label>

          {error && (
            <div className="lm-report-error" role="alert">
              {error}
            </div>
          )}

          <div className="lm-report-actions">
            <button type="submit" className="lm-btn-primary" disabled={pending}>
              {pending ? 'Wird gesendet …' : 'Frage absenden'}
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
