import type { CollectionConfig } from 'payload'
import { createJiraIssue, jiraConfigured, mapPriority } from '../lib/jira'

export const KnownBugs: CollectionConfig = {
  slug: 'known-bugs',
  labels: { singular: 'Bekannter Fehler', plural: 'Bekannte Fehler' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['bugId', 'severity', 'state', 'hidden', 'title', 'updatedAt'],
    group: 'Inhalte',
  },
  access: {
    // Öffentlich lesbar — ausgeblendete Fehler werden für Nicht-Angemeldete gefiltert.
    read: ({ req }) => (req.user ? true : { hidden: { not_equals: true } }),
  },
  fields: [
    {
      name: 'bugId',
      label: 'Fehler-ID (z. B. LUEMOB-001)',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'state',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'offen',
      options: [
        { label: 'Gemeldet', value: 'gemeldet' },
        { label: 'Offen', value: 'offen' },
        { label: 'Behoben', value: 'behoben' },
      ],
      admin: {
        position: 'sidebar',
        description:
          '„Gemeldet“ und „Offen“ stehen oben (nach Priorität), „Behoben“ erscheint unten.',
      },
    },
    {
      name: 'hidden',
      label: 'Ausgeblendet (nicht öffentlich)',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Blendet den Fehler öffentlich aus, ohne ihn zu löschen. Jederzeit umkehrbar.',
      },
    },
    {
      name: 'severity',
      label: 'Schweregrad',
      type: 'select',
      required: true,
      options: [
        { label: 'Hoch', value: 'hoch' },
        { label: 'Mittel', value: 'mittel' },
        { label: 'Niedrig', value: 'niedrig' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'title', label: 'Titel', type: 'text', required: true },
    { name: 'fundort', label: 'Fundort (Quelle/Nachweis)', type: 'text' },
    { name: 'description', label: 'Beschreibung', type: 'textarea' },
    {
      name: 'steps',
      label: 'Schritte zur Reproduktion',
      type: 'array',
      fields: [{ name: 'text', label: 'Schritt', type: 'textarea', required: true }],
    },
    { name: 'expected', label: 'Erwartetes Verhalten', type: 'textarea' },
    { name: 'actual', label: 'Tatsächliches Verhalten', type: 'textarea' },
    {
      name: 'images',
      label: 'Screenshots',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
    },
    { name: 'caption', label: 'Bildunterschrift', type: 'text' },
    { name: 'noImageNote', label: 'Hinweis, falls kein Screenshot vorliegt', type: 'text' },
    {
      name: 'reverse',
      label: 'Bild links statt rechts',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      name: 'builtin',
      label: 'Aus initialem Testbericht übernommen',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      name: 'jiraKey',
      label: 'Jira-Ticket',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description:
          'Wird automatisch gefüllt, sobald der Status auf „Gemeldet“ steht und Jira konfiguriert ist. Verhindert doppelte Tickets.',
      },
    },
    {
      name: 'jiraUrl',
      label: 'Jira-Link',
      type: 'text',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Direktlink zum angelegten Jira-Vorgang.',
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req, context }) => {
        // Nur ein Ticket erzeugen: benötigt Status „gemeldet", noch keinen Jira-Key,
        // konfigurierte Zugangsdaten und keine erneute Auslösung durch unser eigenes Update.
        if (context?.skipJira) return doc
        if (doc.state !== 'gemeldet') return doc
        if (doc.jiraKey) return doc
        if (!jiraConfigured()) return doc

        try {
          const lines: string[] = []
          lines.push(`Fehler-ID: ${doc.bugId}`)
          if (doc.severity) lines.push(`Schweregrad: ${doc.severity}`)
          if (doc.fundort) lines.push(`Fundort: ${doc.fundort}`)
          lines.push('')
          if (doc.description) {
            lines.push('Beschreibung:', doc.description, '')
          }
          if (Array.isArray(doc.steps) && doc.steps.length) {
            lines.push('Schritte zur Reproduktion:')
            doc.steps.forEach((s: { text?: string }, i: number) => {
              if (s?.text) lines.push(`${i + 1}. ${s.text}`)
            })
            lines.push('')
          }
          if (doc.expected) lines.push('Erwartetes Verhalten:', doc.expected, '')
          if (doc.actual) lines.push('Tatsächliches Verhalten:', doc.actual, '')
          lines.push(
            `Quelle: LüMobil Hilfecenter (${process.env.NEXT_PUBLIC_SERVER_URL || ''}/admin/collections/known-bugs/${doc.id})`,
          )

          const { key, url } = await createJiraIssue({
            summary: `[${doc.bugId}] ${doc.title}`,
            description: lines.join('\n'),
            priorityName: doc.severity ? mapPriority(doc.severity) : undefined,
            labels: ['luemobil', 'hilfecenter'],
          })

          await req.payload.update({
            collection: 'known-bugs',
            id: doc.id,
            data: { jiraKey: key, jiraUrl: url },
            // Endlosschleife verhindern: dieses Update löst den Hook erneut aus.
            context: { skipJira: true },
            overrideAccess: true,
          })

          req.payload.logger.info(`Jira-Ticket ${key} für Fehler ${doc.bugId} angelegt.`)
          return { ...doc, jiraKey: key, jiraUrl: url }
        } catch (err) {
          // Fehler beim Jira-Aufruf darf das Speichern des Datensatzes nicht verhindern.
          req.payload.logger.error(
            `Jira-Ticket für Fehler ${doc.bugId} konnte nicht angelegt werden: ${
              err instanceof Error ? err.message : String(err)
            }`,
          )
          return doc
        }
      },
    ],
  },
}
