import type { CollectionConfig } from 'payload'

/**
 * Fehlermeldungen von Nutzenden (öffentliches Formular auf /fehler).
 *
 * Zugriff: Lesen/Bearbeiten nur für angemeldete Redakteure.
 * Das Anlegen läuft ausschließlich über die Server Action
 * (src/app/(frontend)/fehler/actions.ts) mit Validierung und Honeypot —
 * die öffentliche REST-API erlaubt KEIN direktes Erstellen.
 */
export const BugReports: CollectionConfig = {
  slug: 'bug-reports',
  labels: { singular: 'Fehlermeldung', plural: 'Fehlermeldungen' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'severity', 'status', 'reporter', 'createdAt'],
    group: 'Meldungen',
    description:
      'Von Nutzenden über das öffentliche Formular gemeldete Fehler. Nach Prüfung ggf. als „Bekannter Fehler“ übernehmen und hier den Status setzen.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
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
        { label: 'Übernommen (Bekannter Fehler)', value: 'uebernommen' },
        { label: 'Abgelehnt / Duplikat', value: 'abgelehnt' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'severity',
      label: 'Schweregrad (Einschätzung der meldenden Person)',
      type: 'select',
      required: true,
      defaultValue: 'mittel',
      options: [
        { label: 'Hoch', value: 'hoch' },
        { label: 'Mittel', value: 'mittel' },
        { label: 'Niedrig', value: 'niedrig' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'title', label: 'Titel', type: 'text', required: true },
    { name: 'description', label: 'Beschreibung', type: 'textarea', required: true },
    {
      name: 'steps',
      label: 'Schritte zur Reproduktion',
      type: 'array',
      fields: [{ name: 'text', label: 'Schritt', type: 'textarea', required: true }],
    },
    { name: 'expected', label: 'Erwartetes Verhalten', type: 'textarea' },
    { name: 'actual', label: 'Tatsächliches Verhalten', type: 'textarea' },
    { name: 'reporter', label: 'Melder:in (Name oder Abteilung)', type: 'text' },
    {
      name: 'images',
      label: 'Screenshots',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
    },
    {
      name: 'internalNote',
      label: 'Interne Notiz (nicht öffentlich)',
      type: 'textarea',
      admin: { position: 'sidebar' },
    },
  ],
}
