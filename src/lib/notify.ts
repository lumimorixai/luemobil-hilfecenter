import type { Payload } from 'payload'

/**
 * Sendet eine Benachrichtigungs-E-Mail an alle Redakteur:innen, die in ihrem
 * Profil „E-Mail-Benachrichtigung bei neuen Meldungen“ aktiviert haben.
 *
 * Versendet nur, wenn SMTP konfiguriert ist (SMTP_HOST gesetzt). Fehler beim
 * Versand werden protokolliert, aber nie an die aufrufende Stelle weitergereicht
 * — eine fehlgeschlagene Mail darf das Speichern einer Meldung nicht verhindern.
 */
export async function notifyEditors(
  payload: Payload,
  opts: { subject: string; text: string; html?: string },
): Promise<void> {
  if (!process.env.SMTP_HOST) return
  try {
    const users = await payload.find({
      collection: 'users',
      where: { notifyOnSubmissions: { equals: true } },
      limit: 200,
      depth: 0,
    })
    const to = users.docs.map((u) => u.email).filter((e): e is string => Boolean(e))
    if (to.length === 0) return
    await payload.sendEmail({ to, subject: opts.subject, text: opts.text, html: opts.html })
    payload.logger.info(`Benachrichtigung versendet an ${to.length} Empfänger: ${opts.subject}`)
  } catch (err) {
    payload.logger.error(`E-Mail-Benachrichtigung fehlgeschlagen: ${(err as Error).message}`)
  }
}

/** Basis-URL des Admin-Panels für Deep-Links in Benachrichtigungen. */
export function adminUrl(collection: string, id: string | number): string {
  const base = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/admin/collections/${collection}/${id}`
}
