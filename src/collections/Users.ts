import type { CollectionConfig } from 'payload'
import { nurAdminFeld } from '../lib/payloadRoles'

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
      name: 'role',
      label: 'Rolle',
      type: 'select',
      defaultValue: 'redaktion',
      options: [
        { label: 'Administrator (sieht auch Kundendaten)', value: 'admin' },
        { label: 'Redaktion (Inhalte und Meldungen)', value: 'redaktion' },
      ],
      access: { create: nurAdminFeld, update: nurAdminFeld },
      admin: {
        description:
          'Kundendaten aus dem Patris-Import (inkl. Telefonnummern) sehen nur Administratoren. Konten ohne gesetzte Rolle gelten als Administrator.',
      },
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
