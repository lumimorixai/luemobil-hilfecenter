/**
 * CLI-Seed: importiert die Legacy-Inhalte aus legacy/luemobil-data.js
 * in die Payload-Datenbank (inkl. Screenshots als Media-Uploads).
 *
 * Ausführen mit:  pnpm seed
 * Idempotent — existieren bereits Inhalte, passiert nichts.
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'
import config from '../payload.config'
import { seedDatabase } from './seedDatabase'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(dirname, '../..')

async function run() {
  const payload = await getPayload({ config })
  const result = await seedDatabase(payload, { legacyDir: path.join(projectRoot, 'legacy') })
  if (result.seeded && !result.ok) {
    payload.logger.error('Zähl-Check FEHLGESCHLAGEN.')
    process.exit(1)
  }
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
