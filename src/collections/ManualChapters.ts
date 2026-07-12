import type { CollectionConfig } from 'payload'

export const ManualChapters: CollectionConfig = {
  slug: 'manual-chapters',
  labels: { singular: 'Handbuch-Kapitel', plural: 'Handbuch-Kapitel' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['num', 'title', 'updatedAt'],
    group: 'Inhalte',
  },
  access: {
    read: () => true,
  },
  defaultSort: 'order',
  fields: [
    {
      name: 'slug',
      label: 'Slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'order',
      label: 'Sortierung',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
    { name: 'num', label: 'Kapitel-Nummer (z. B. „1 · Erste Schritte“)', type: 'text' },
    { name: 'title', label: 'Titel', type: 'text', required: true },
    {
      name: 'layout',
      label: 'Bild-Layout',
      type: 'select',
      options: [
        { label: 'Einzelbild', value: 'single' },
        { label: 'Bildreihe', value: 'row' },
      ],
      defaultValue: 'single',
      admin: { position: 'sidebar' },
    },
    {
      name: 'reverse',
      label: 'Bild links statt rechts',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      name: 'images',
      label: 'Screenshots',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
    },
    {
      name: 'paras',
      label: 'Absätze',
      type: 'array',
      fields: [{ name: 'text', label: 'Absatz', type: 'textarea', required: true }],
    },
    {
      name: 'bullets',
      label: 'Aufzählungspunkte',
      type: 'array',
      fields: [{ name: 'text', label: 'Punkt', type: 'textarea', required: true }],
    },
    { name: 'note', label: 'Hinweis-Box', type: 'textarea' },
  ],
}
