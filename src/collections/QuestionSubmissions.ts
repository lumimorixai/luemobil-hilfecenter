import type { CollectionConfig, Payload } from 'payload'
import { notifyEditors, adminUrl } from '../lib/notify'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Nächste freie Frage-ID im Format OF-16 über alle Offene-Fragen-Gruppen. */
async function nextOpenQuestionId(payload: Payload): Promise<string> {
  const groups = await payload.find({ collection: 'open-questions', limit: 1000, depth: 0 })
  let max = 0
  for (const g of groups.docs) {
    for (const item of g.items ?? []) {
      const m = /(\d+)$/.exec(item.qid ?? '')
      if (m) max = Math.max(max, parseInt(m[1], 10))
    }
  }
  return `OF-${String(max + 1).padStart(2, '0')}`
}

/** Zielgruppe bestimmen: gewählte Gruppe, sonst „Von Nutzenden eingereicht“ (wird bei Bedarf angelegt). */
async function resolveTargetGroup(
  payload: Payload,
  chosen: number | { id: number } | null | undefined,
): Promise<number> {
  if (chosen) return typeof chosen === 'object' ? chosen.id : chosen
  const existing = await payload.find({
    collection: 'open-questions',
    where: { group: { equals: 'Von Nutzenden eingereicht' } },
    limit: 1,
  })
  if (existing.docs[0]) return existing.docs[0].id
  const created = await payload.create({
    collection: 'open-questions',
    data: { group: 'Von Nutzenden eingereicht', order: 99, items: [] },
  })
  return created.id
}

/**
 * Fragen von Nutzenden (öffentliches Formular auf /fragen).
 *
 * Zugriff: nur angemeldete Redakteure. Das Anlegen läuft über die Server Action
 * (src/app/(frontend)/fragen/actions.ts) mit Validierung und Honeypot.
 *
 * Übernahme-Workflow: Status auf „Übernommen (online sichtbar)“ setzen und
 * speichern → die Frage wird als Eintrag an die gewählte Offene-Fragen-Gruppe
 * angehängt und ist damit öffentlich sichtbar.
 */
export const QuestionSubmissions: CollectionConfig = {
  slug: 'question-submissions',
  labels: { singular: 'Eingereichte Frage', plural: 'Eingereichte Fragen' },
  admin: {
    useAsTitle: 'question',
    defaultColumns: ['question', 'status', 'reporter', 'createdAt'],
    group: 'Meldungen',
    description:
      'Von Nutzenden über das öffentliche Formular eingereichte Fragen. Antwort ergänzen, Zielgruppe wählen und Status auf „Übernommen“ setzen, damit die Frage online erscheint.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  hooks: {
    afterChange: [
      // Benachrichtigung bei neu eingereichter Frage
      async ({ doc, req, operation }) => {
        if (operation === 'create') {
          const url = adminUrl('question-submissions', doc.id)
          await notifyEditors(req.payload, {
            subject: 'Neue Frage eingereicht',
            text: `Es ist eine neue Frage eingegangen.\n\nFrage: ${doc.question}\nEingereicht von: ${doc.reporter || '—'}\nKontakt: ${doc.contact || '—'}\n\nIm Admin öffnen: ${url}`,
            html: `<p>Es ist eine neue Frage eingegangen.</p>
<p><strong>Frage:</strong><br>${escapeHtml(doc.question || '—').replace(/\n/g, '<br>')}</p>
<p><strong>Eingereicht von:</strong> ${escapeHtml(doc.reporter || '—')}<br>
<strong>Kontakt:</strong> ${escapeHtml(doc.contact || '—')}</p>
<p><a href="${url}">Im Admin-Panel öffnen</a></p>`,
          })
        }
        return doc
      },
      async ({ doc, req }) => {
        if (doc.status !== 'uebernommen' || doc.convertedTo) return doc

        const groupId = await resolveTargetGroup(req.payload, doc.targetGroup)
        const group = await req.payload.findByID({ collection: 'open-questions', id: groupId })
        const qid = await nextOpenQuestionId(req.payload)
        const hasAnswer = Boolean((doc.answer ?? '').trim())

        await req.payload.update({
          collection: 'open-questions',
          id: groupId,
          req,
          data: {
            items: [
              ...(group.items ?? []),
              {
                qid,
                status: hasAnswer ? 'beantwortet' : 'offen',
                question: doc.question,
                answer: doc.answer ?? '',
                note: '',
              },
            ],
          },
        })

        await req.payload.update({
          collection: 'question-submissions',
          id: doc.id,
          req,
          data: { convertedTo: groupId, publishedQid: qid },
        })
        req.payload.logger.info(
          `Eingereichte Frage ${doc.id} als ${qid} in Gruppe „${group.group}“ veröffentlicht.`,
        )
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'status',
      label: 'Bearbeitungsstatus',
      type: 'select',
      required: true,
      defaultValue: 'neu',
      options: [
        { label: 'Neu', value: 'neu' },
        { label: 'In Prüfung', value: 'in-pruefung' },
        { label: 'Übernommen (online sichtbar)', value: 'uebernommen' },
        { label: 'Abgelehnt / Duplikat', value: 'abgelehnt' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'targetGroup',
      label: 'Zielgruppe bei Übernahme',
      type: 'relationship',
      relationTo: 'open-questions',
      admin: {
        position: 'sidebar',
        description:
          'In welcher Gruppe die Frage nach Übernahme erscheint. Leer = „Von Nutzenden eingereicht“.',
      },
    },
    { name: 'question', label: 'Frage', type: 'textarea', required: true },
    {
      name: 'answer',
      label: 'Antwort (vor Veröffentlichung ergänzen)',
      type: 'textarea',
    },
    { name: 'reporter', label: 'Eingereicht von (Name oder Abteilung)', type: 'text' },
    {
      name: 'contact',
      label: 'Kontakt für Rückfragen (optional)',
      type: 'text',
      admin: { description: 'E-Mail oder Telefon, falls die Person eine Antwort wünscht.' },
    },
    {
      name: 'internalNote',
      label: 'Interne Notiz (nicht öffentlich)',
      type: 'textarea',
      admin: { position: 'sidebar' },
    },
    {
      name: 'convertedTo',
      label: 'Veröffentlicht in Gruppe',
      type: 'relationship',
      relationTo: 'open-questions',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Wird automatisch gesetzt, sobald die Frage übernommen wurde.',
      },
    },
    {
      name: 'publishedQid',
      label: 'Veröffentlichte Frage-ID',
      type: 'text',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
