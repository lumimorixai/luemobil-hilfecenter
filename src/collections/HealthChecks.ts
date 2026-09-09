import type { CollectionConfig } from 'payload'

/**
 * Ergebnis der minütlichen Systemstatus-Checks (Keycloak, synthetischer Login,
 * Datenbank). Dient (a) der Zustands-/Störungserkennung fürs Alerting und
 * (b) als Verfügbarkeits-Historie. Befüllung durch den Job src/jobs/healthAlert.ts.
 * Nur lesend im Admin; kein öffentlicher REST-Zugriff.
 */
export const HealthChecks: CollectionConfig = {
  slug: 'health-checks',
  labels: { singular: 'Health-Check', plural: 'Health-Checks' },
  admin: {
    useAsTitle: 'checkedAt',
    defaultColumns: ['checkedAt', 'alertedDown'],
    group: 'Cockpit',
    description: 'Minütliche Systemstatus-Checks (Ampel, Alerting, Verfügbarkeit).',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'checkedAt', label: 'Zeitpunkt', type: 'date', required: true, index: true, admin: { readOnly: true } },
    { name: 'status', label: 'Status je Dienst', type: 'json', admin: { readOnly: true } },
    { name: 'failCounts', label: 'Fehler-Zähler', type: 'json', admin: { readOnly: true } },
    { name: 'alertedDown', label: 'Aktive Störungen', type: 'json', admin: { readOnly: true } },
  ],
}
