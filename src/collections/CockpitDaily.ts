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
      label: 'Neu angelegte Konten',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      admin: {
        readOnly: true,
        description:
          'Alle an diesem Tag angelegten Konten (createdTimestamp) — migrierte und selbst registrierte zusammen. Erklärt den Kontenbestand vollständig.',
      },
    },
    {
      name: 'migratedUsers',
      label: 'Davon aus dem Altsystem übernommen',
      type: 'number',
      min: 0,
      admin: {
        readOnly: true,
        description:
          'Konten mit Verbindung zum Altsystem (federationLink). Wird beim Backfill gesetzt, nicht im Minutentakt.',
      },
    },
    {
      name: 'totalUsers',
      label: 'Kontenbestand (Ende des Tages)',
      type: 'number',
      min: 0,
      admin: {
        readOnly: true,
        description:
          'Zahl der Konten im Realm, zuletzt gemessen an diesem Tag. Quelle: Keycloak-Zähler, geschrieben vom Minuten-Job.',
      },
    },
    {
      name: 'support',
      label: 'Support-Ereignisse',
      type: 'json',
      admin: {
        readOnly: true,
        description:
          'Passwort-Reset, Passwortänderung, Verifizierungs-Mails, Registrierungen — Zahlen dieses Tages.',
      },
    },
    {
      name: 'availability',
      label: 'Verfügbarkeit je Dienst',
      type: 'json',
      admin: {
        readOnly: true,
        description:
          'Messpunkte, Ausfälle und Uptime je Dienst an diesem Tag — verdichtet aus den Minuten-Checks, damit die Historie erhalten bleibt, wenn die Rohdaten aufgeräumt werden.',
      },
    },
    {
      name: 'loginsByClient',
      label: 'Logins je Client',
      type: 'json',
      admin: {
        readOnly: true,
        description: 'Erfolgreiche Logins und eindeutige Nutzer je Client an diesem Tag.',
      },
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
