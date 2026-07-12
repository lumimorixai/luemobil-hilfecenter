import type { CollectionConfig } from 'payload'

export const FaqGroups: CollectionConfig = {
  slug: 'faq-groups',
  labels: { singular: 'FAQ-Gruppe', plural: 'FAQ-Gruppen' },
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
        { name: 'q', label: 'Frage', type: 'text', required: true },
        { name: 'a', label: 'Antwort', type: 'textarea', required: true },
      ],
    },
  ],
}
