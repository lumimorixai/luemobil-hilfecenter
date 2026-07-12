'use server'

import { payloadClient } from '@/lib/content'

export type QuestionResult = { ok: true } | { ok: false; error: string }

function clean(value: FormDataEntryValue | null, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

/**
 * Öffentliche Frage entgegennehmen (Formular auf /fragen).
 * Läuft serverseitig über die Payload Local API — die Collection selbst
 * bleibt für die öffentliche REST-API gesperrt.
 */
export async function submitQuestion(formData: FormData): Promise<QuestionResult> {
  // Honeypot: Bots füllen das unsichtbare Feld aus → still verwerfen
  if (clean(formData.get('website'), 100)) {
    return { ok: true }
  }

  const question = clean(formData.get('question'), 2000)
  const reporter = clean(formData.get('reporter'), 120)
  const contact = clean(formData.get('contact'), 160)

  if (!question) {
    return { ok: false, error: 'Bitte formulieren Sie Ihre Frage.' }
  }

  try {
    const payload = await payloadClient()
    await payload.create({
      collection: 'question-submissions',
      data: { status: 'neu', question, reporter, contact },
    })
    return { ok: true }
  } catch (err) {
    console.error('Frage-Einreichung fehlgeschlagen:', err)
    return {
      ok: false,
      error: 'Ihre Frage konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.',
    }
  }
}
