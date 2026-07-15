import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Benutzer', plural: 'Benutzer' },
  auth: true,
  admin: {
    useAsTitle: 'email',
    group: 'System',
  },
  fields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
    },
    {
      name: 'notifyOnSubmissions',
      label: 'E-Mail-Benachrichtigung bei neuen Meldungen',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'Bei neuen Fehlermeldungen und eingereichten Fragen eine E-Mail erhalten. Kann jederzeit deaktiviert werden.',
      },
    },
  ],
}
