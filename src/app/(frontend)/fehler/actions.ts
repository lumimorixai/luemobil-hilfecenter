'use server'

import { payloadClient } from '@/lib/content'

export type ReportResult = { ok: true } | { ok: false; error: string }

const MAX_IMAGES = 3
const MAX_IMAGE_BYTES = 4 * 1024 * 1024 // 4 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function clean(value: FormDataEntryValue | null, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

/**
 * Öffentliche Fehlermeldung entgegennehmen (Formular auf /fehler).
 * Läuft serverseitig über die Payload Local API — die Collection selbst
 * bleibt für die öffentliche REST-API gesperrt.
 */
export async function submitBugReport(formData: FormData): Promise<ReportResult> {
  // Honeypot: Bots füllen das unsichtbare Feld aus → still verwerfen
  if (clean(formData.get('website'), 100)) {
    return { ok: true }
  }

  const title = clean(formData.get('title'), 200)
  const description = clean(formData.get('description'), 5000)
  const severityRaw = clean(formData.get('severity'), 20)
  const severity = (['hoch', 'mittel', 'niedrig'].includes(severityRaw) ? severityRaw : 'mittel') as
    | 'hoch'
    | 'mittel'
    | 'niedrig'
  const stepsRaw = clean(formData.get('steps'), 5000)
  const expected = clean(formData.get('expected'), 2000)
  const actual = clean(formData.get('actual'), 2000)
  const reporter = clean(formData.get('reporter'), 120)

  if (!title || !description) {
    return { ok: false, error: 'Bitte füllen Sie Titel und Beschreibung aus.' }
  }

  try {
    const payload = await payloadClient()

    // Screenshots (optional, max. 3, je max. 4 MB, nur Bildformate)
    const imageIds: number[] = []
    const files = formData
      .getAll('images')
      .filter((f): f is File => f instanceof File && f.size > 0)
      .slice(0, MAX_IMAGES)

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return { ok: false, error: 'Screenshots bitte nur als JPG, PNG oder WebP hochladen.' }
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return { ok: false, error: 'Ein Screenshot ist größer als 4 MB — bitte verkleinern.' }
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      const doc = await payload.create({
        collection: 'media',
        data: { alt: `Fehlermeldung: ${title}` },
        file: {
          data: buffer,
          name: file.name || 'screenshot.jpg',
          mimetype: file.type,
          size: buffer.length,
        },
      })
      imageIds.push(doc.id)
    }

    await payload.create({
      collection: 'bug-reports',
      data: {
        status: 'neu',
        severity,
        title,
        description,
        steps: stepsRaw
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 30)
          .map((text) => ({ text })),
        expected,
        actual,
        reporter,
        images: imageIds,
      },
    })

    return { ok: true }
  } catch (err) {
    console.error('Fehlermeldung fehlgeschlagen:', err)
    return { ok: false, error: 'Die Meldung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.' }
  }
}
