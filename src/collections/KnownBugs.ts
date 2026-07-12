import type { CollectionConfig } from 'payload'

export const KnownBugs: CollectionConfig = {
  slug: 'known-bugs',
  labels: { singular: 'Bekannter Fehler', plural: 'Bekannte Fehler' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['bugId', 'severity', 'title', 'updatedAt'],
    group: 'Inhalte',
  },
  access: {
    read: () => true,
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
  ],
}
