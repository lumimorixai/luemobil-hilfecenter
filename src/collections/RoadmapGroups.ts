import type { CollectionConfig } from 'payload'

/**
 * Ausblick auf Version 2 — im CMS pflegbar.
 * Jeder Eintrag ist ein Block (mit Überschrift, Einleitung, Sortierung) und
 * enthält eine Liste von Punkten (Titel, Status, Beschreibung).
 */
export const RoadmapGroups: CollectionConfig = {
  slug: 'roadmap',
  labels: { singular: 'Ausblick-Block', plural: 'Ausblick V2' },
  admin: {
    useAsTitle: 'heading',
    defaultColumns: ['heading', 'kicker', 'order', 'updatedAt'],
    group: 'Inhalte',
    description:
      'Inhalte der Seite „Ausblick auf Version 2“. Blöcke lassen sich hinzufügen, sortieren und mit Punkten füllen.',
  },
  access: {
    read: () => true,
  },
  defaultSort: 'order',
  fields: [
    {
      name: 'order',
      label: 'Sortierung',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar', description: 'Kleinere Zahl = weiter oben.' },
    },
    { name: 'kicker', label: 'Kurz-Label (über der Überschrift)', type: 'text' },
    { name: 'heading', label: 'Überschrift', type: 'text', required: true },
    { name: 'intro', label: 'Einleitungstext', type: 'textarea' },
    {
      name: 'items',
      label: 'Punkte',
      type: 'array',
      fields: [
        { name: 'title', label: 'Titel', type: 'text', required: true },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          defaultValue: 'geplant',
          options: [
            { label: 'Geplant', value: 'geplant' },
            { label: 'In Prüfung', value: 'in Prüfung' },
            { label: 'In Vorbereitung', value: 'in Vorbereitung' },
          ],
        },
        { name: 'text', label: 'Beschreibung', type: 'textarea' },
      ],
    },
  ],
}
