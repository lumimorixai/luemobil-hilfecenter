import type { CollectionConfig } from 'payload'

export const OpenQuestions: CollectionConfig = {
  slug: 'open-questions',
  labels: { singular: 'Fragen-Gruppe', plural: 'Offene Fragen' },
  admin: {
    useAsTitle: 'group',
    defaultColumns: ['group', 'order', 'updatedAt'],
    group: 'Inhalte',
  },
  access: {
    read: () => true,
  },
  defaultSort: 'order',
  fields: [
    { name: 'group', label: 'Gruppenname', type: 'text', required: true },
    {
      name: 'order',
      label: 'Sortierung',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
    {
      name: 'items',
      label: 'Fragen',
      type: 'array',
      fields: [
        { name: 'qid', label: 'Frage-ID (z. B. OF-00)', type: 'text', required: true },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          defaultValue: 'offen',
          options: [
            { label: 'Offen', value: 'offen' },
            { label: 'Beantwortet', value: 'beantwortet' },
          ],
        },
        { name: 'question', label: 'Frage', type: 'textarea', required: true },
        { name: 'answer', label: 'Antwort', type: 'textarea' },
        { name: 'note', label: 'Anmerkung', type: 'textarea' },
      ],
    },
  ],
}
