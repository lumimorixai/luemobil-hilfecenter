import type { CollectionConfig } from 'payload'
import { istAdmin, nurAdmin } from '../lib/payloadRoles'

/**
 * Ticketberechtigungen laut Patris (CSV-Export). Wird beim Upload im
 * Migrations-Cockpit komplett ersetzt (src/lib/cockpit/patris.ts) und vom
 * Kundencheck gelesen. Nur die hier definierten Spalten werden übernommen,
 * alle übrigen CSV-Felder verworfen. Im Admin nur lesbar; kein öffentlicher
 * REST-Zugriff. Lesen nur für Payload-Administratoren — die Daten enthalten
 * Namen, Kundennummern und E-Mail-Adressen.
 */
export const PatrisEntitlements: CollectionConfig = {
  slug: 'patris-entitlements',
  labels: { singular: 'Patris-Ticket', plural: 'Patris-Tickets' },
  admin: {
    useAsTitle: 'entitlementId',
    defaultColumns: ['entitlementId', 'productName', 'email', 'validFrom', 'validUntil'],
    group: 'Cockpit',
    hidden: ({ user }) => !istAdmin(user as { role?: 'admin' | 'redaktion' | null }),
    description:
      'Ticketberechtigungen aus dem Patris-Export. Befüllung ausschließlich per CSV-Upload im Migrations-Cockpit (ersetzt den gesamten Bestand).',
  },
  access: {
    read: nurAdmin,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'entitlementId', label: 'Entitlement-ID', type: 'text', required: true, index: true },
    { name: 'validFrom', label: 'Gültig ab', type: 'date' },
    { name: 'validUntil', label: 'Gültig bis', type: 'date' },
    { name: 'productNumber', label: 'Produktnummer', type: 'text' },
    { name: 'productName', label: 'Produkt', type: 'text' },
    { name: 'customerNumber', label: 'Kundennummer', type: 'text', index: true },
    { name: 'email', label: 'E-Mail', type: 'text', index: true },
    { name: 'firstName', label: 'Vorname', type: 'text' },
    { name: 'lastName', label: 'Nachname', type: 'text' },
  ],
}
