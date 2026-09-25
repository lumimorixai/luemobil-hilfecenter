import type { GlobalConfig } from 'payload'
import { nurAdmin } from '../lib/payloadRoles'

/**
 * Stand des letzten Patris-CSV-Uploads (wird vom Upload geschrieben, im Admin
 * nur lesbar). Der Kundencheck zeigt daraus den Datenstand an.
 */
export const PatrisImport: GlobalConfig = {
  slug: 'patris-import',
  label: 'Patris-Import',
  admin: {
    group: 'Cockpit',
    description: 'Letzter CSV-Upload der Patris-Ticketdaten (Upload im Migrations-Cockpit).',
  },
  access: {
    read: nurAdmin,
    update: () => false,
  },
  fields: [
    { name: 'importedAt', label: 'Hochgeladen am', type: 'date', admin: { readOnly: true } },
    { name: 'fileName', label: 'Datei', type: 'text', admin: { readOnly: true } },
    { name: 'importedBy', label: 'Hochgeladen von', type: 'text', admin: { readOnly: true } },
    { name: 'rowCount', label: 'Übernommene Zeilen', type: 'number', admin: { readOnly: true } },
    { name: 'skippedRows', label: 'Übersprungene Zeilen', type: 'number', admin: { readOnly: true } },
  ],
}
