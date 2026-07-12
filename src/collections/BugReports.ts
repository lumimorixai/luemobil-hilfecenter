import type { CollectionConfig } from 'payload'

/** Nächste freie Fehler-ID im Format LUEMOB-016 ermitteln. */
async function nextBugId(payload: import('payload').Payload): Promise<string> {
  const all = await payload.find({
    collection: 'known-bugs',
    limit: 1000,
    depth: 0,
    select: { bugId: true },
  })
  let max = 0
  for (const doc of all.docs) {
    const m = /(\d+)$/.exec(doc.bugId ?? '')
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `LUEMOB-${String(max + 1).padStart(3, '0')}`
}

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
  hooks: {
    /**
     * Übernahme-Workflow: Status auf „Übernommen (Bekannter Fehler)“ setzen
     * und speichern → es wird automatisch ein Eintrag in known-bugs erzeugt
     * (einmalig; die Verknüpfung steht danach in `convertedTo`).
     */
    afterChange: [
      async ({ doc, req }) => {
        if (doc.status !== 'uebernommen' || doc.convertedTo) return doc

        const reportedAt = doc.createdAt
          ? new Date(doc.createdAt).toLocaleDateString('de-DE')
          : ''
        const known = await req.payload.create({
          collection: 'known-bugs',
          req,
          data: {
            bugId: await nextBugId(req.payload),
            severity: doc.severity,
            state: 'gemeldet',
            hidden: false,
            title: doc.title,
            fundort: `Nutzermeldung${doc.reporter ? ` von ${doc.reporter}` : ''}${reportedAt ? ` vom ${reportedAt}` : ''}`,
            description: doc.description,
            steps: (doc.steps ?? []).map((s: { text: string }) => ({ text: s.text })),
            expected: doc.expected ?? '',
            actual: doc.actual ?? '',
            images: (doc.images ?? []).map((img: number | { id: number }) =>
              typeof img === 'object' ? img.id : img,
            ),
            caption: '',
            noImageNote: '',
            reverse: false,
            builtin: false,
          },
        })

        await req.payload.update({
          collection: 'bug-reports',
          id: doc.id,
          req,
          data: { convertedTo: known.id },
        })
        req.payload.logger.info(
          `Fehlermeldung ${doc.id} als Bekannter Fehler ${known.bugId} übernommen.`,
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
    {
      name: 'convertedTo',
      label: 'Übernommen als Bekannter Fehler',
      type: 'relationship',
      relationTo: 'known-bugs',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description:
          'Wird automatisch gesetzt, sobald der Status auf „Übernommen“ gestellt und gespeichert wird.',
      },
    },
  ],
}
