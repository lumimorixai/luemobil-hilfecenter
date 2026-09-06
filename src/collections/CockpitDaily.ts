import type { CollectionConfig } from 'payload'

/**
 * Tages-Aggregate der Migrations-Zeitreihe. Keycloak-Events verfallen (Realm-
 * Expiration), daher werden die Tageswerte hier persistiert. Befüllung durch
 * den Minuten-Job (src/jobs/aggregateDaily.ts), der den heutigen Datensatz per
 * Upsert aktualisiert. Die 14-Tage-Charts lesen aus dieser Collection.
 *
 * Nur lesend im Admin sichtbar; Schreibzugriff ausschließlich über den Job
 * (Local API mit overrideAccess). Kein öffentlicher REST-Zugriff.
 */
export const CockpitDaily: CollectionConfig = {
  slug: 'cockpit-daily',
  labels: { singular: 'Cockpit-Tageswert', plural: 'Cockpit-Tageswerte' },
  admin: {
    useAsTitle: 'datum',
    defaultColumns: ['datum', 'logins', 'loginErrors', 'newUsers'],
    group: 'Cockpit',
    description: 'Automatisch befüllte Tages-Aggregate für die Migrations-Zeitreihe.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'datum',
      label: 'Datum',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: 'Format JJJJ-MM-TT.',
      },
    },
    {
      name: 'logins',
      label: 'Erfolgreiche Logins',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      admin: { readOnly: true },
    },
    {
      name: 'loginErrors',
      label: 'Fehlgeschlagene Logins',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      admin: { readOnly: true },
    },
    {
      name: 'newUsers',
      label: 'Neu migriert (föderiert)',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      admin: { readOnly: true },
    },
    {
      name: 'registrations',
      label: 'Davon Selbstregistrierungen',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      admin: { readOnly: true },
    },
  ],
}
