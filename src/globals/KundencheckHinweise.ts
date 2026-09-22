import type { Field, GlobalConfig } from 'payload'
import { HINT_SITUATIONS } from '../lib/cockpit/hints'

/**
 * Hinweistexte für den Kundencheck — je Ampel-Situation ein Titel und ein
 * Text, den das Servicecenter dem Kunden sinngemäß sagt. Leere Felder fallen
 * auf die Standardtexte aus src/lib/cockpit/hints.ts zurück.
 */
const situationFields: Field[] = HINT_SITUATIONS.map((s) => ({
  name: s.key,
  label: s.label,
  type: 'group',
  admin: { description: s.when },
  fields: [
    { name: 'titel', label: 'Titel', type: 'text', defaultValue: s.defaultTitle },
    { name: 'text', label: 'Hinweistext', type: 'textarea', defaultValue: s.defaultText },
  ],
}))

export const KundencheckHinweise: GlobalConfig = {
  slug: 'kundencheck-hinweise',
  label: 'Kundencheck-Hinweise',
  admin: {
    group: 'Cockpit',
    description:
      'Texte, die der Kundencheck je Situation anzeigt. Platzhalter: {produkt}, {von}, {bis}, {vorname}, {nachname}, {kundennummer} (Patris) sowie {kaufdatum}, {kaufprodukt}, {bestellnummer} (letzter erfolgreicher Kauf in der App).',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
  },
  fields: situationFields,
}
