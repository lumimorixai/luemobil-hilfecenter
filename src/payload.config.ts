import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { de } from '@payloadcms/translations/languages/de'
import { en } from '@payloadcms/translations/languages/en'
import sharp from 'sharp'

import { seedDatabase } from './seed/seedDatabase'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Articles } from './collections/Articles'
import { FaqGroups } from './collections/FaqGroups'
import { ManualChapters } from './collections/ManualChapters'
import { KnownBugs } from './collections/KnownBugs'
import { OpenQuestions } from './collections/OpenQuestions'
import { BugReports } from './collections/BugReports'
import { QuestionSubmissions } from './collections/QuestionSubmissions'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const databaseUri = process.env.DATABASE_URI || 'file:./luemobil.db'

// Adapter bedingt laden: im Container (Postgres) wird der SQLite-Adapter — und
// damit dessen native Abhängigkeit `libsql` — gar nicht erst geladen.
const db = databaseUri.startsWith('postgres')
  ? (await import('@payloadcms/db-postgres')).postgresAdapter({
      pool: { connectionString: databaseUri },
      // Schema beim Start automatisch anlegen/abgleichen — sonst fehlen im
      // Produktionsmodus die Tabellen (push ist dort standardmäßig aus).
      push: true,
    })
  : (await import('@payloadcms/db-sqlite')).sqliteAdapter({
      client: { url: databaseUri },
    })

export default buildConfig({
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: ' · LüMobil Hilfecenter',
      icons: [{ rel: 'icon', type: 'image/png', url: '/swl-innovation-mark.png' }],
    },
    components: {
      graphics: {
        Logo: '/components/admin/Logo.tsx#Logo',
        Icon: '/components/admin/Icon.tsx#Icon',
      },
      beforeNavLinks: ['/components/admin/JiraExportLink.tsx#JiraExportLink'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  i18n: {
    supportedLanguages: { de, en },
    fallbackLanguage: 'de',
  },
  collections: [
    Articles,
    FaqGroups,
    ManualChapters,
    KnownBugs,
    OpenQuestions,
    BugReports,
    QuestionSubmissions,
    Media,
    Users,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || 'dev-secret-please-change',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db,
  sharp,
  // Automatischer Erstimport beim Container-Start (nur wenn SEED_ON_INIT=true
  // und die Datenbank noch leer ist). Steuerung über docker-compose.
  onInit: async (payload) => {
    if (process.env.SEED_ON_INIT !== 'true') return
    try {
      await seedDatabase(payload)
    } catch (err) {
      payload.logger.error(`Automatischer Seed fehlgeschlagen: ${(err as Error).message}`)
    }
  },
})
