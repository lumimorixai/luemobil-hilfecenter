import type { CollectionConfig } from 'payload'

export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: { singular: 'Hilfeartikel', plural: 'Hilfeartikel' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'updatedAt'],
    group: 'Inhalte',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'slug',
      label: 'Slug (URL-Kennung)',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'category',
      label: 'Kategorie',
      type: 'select',
      required: true,
      options: [
        'Verbindungssuche',
        'Konto & Personalisierung',
        'Fahrplanauskunft',
        'Tickets',
        'Hilfe & Kontakt',
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'title', label: 'Titel', type: 'text', required: true },
    { name: 'excerpt', label: 'Kurzbeschreibung (Kachel)', type: 'textarea' },
    { name: 'meta', label: 'Meta-Zeile (Zielgruppe · Lesezeit)', type: 'text' },
    { name: 'short', label: 'Kurzantwort', type: 'textarea' },
    {
      name: 'steps',
      label: 'Schritte (einfache Liste)',
      type: 'array',
      fields: [{ name: 'text', label: 'Schritt', type: 'textarea', required: true }],
    },
    {
      name: 'stepGroups',
      label: 'Schritt-Gruppen (mit Zwischenüberschriften)',
      type: 'array',
      fields: [
        { name: 'heading', label: 'Zwischenüberschrift', type: 'text', required: true },
        {
          name: 'items',
          label: 'Schritte',
          type: 'array',
          fields: [{ name: 'text', label: 'Schritt', type: 'textarea', required: true }],
        },
      ],
    },
    {
      name: 'tips',
      label: 'Tipps',
      type: 'array',
      fields: [{ name: 'text', label: 'Tipp', type: 'textarea', required: true }],
    },
    {
      name: 'related',
      label: 'Verwandte Artikel',
      type: 'relationship',
      relationTo: 'articles',
      hasMany: true,
    },
  ],
}
