import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
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
import { RoadmapGroups } from './collections/RoadmapGroups'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const databaseUri = process.env.DATABASE_URI || 'file:./luemobil.db'

// Adapter bedingt laden: im Container (Postgres) wird der SQLite-Adapter — und
// damit dessen native Abhängigkeit `libsql` — gar nicht erst geladen.
const db = databaseUri.startsWith('postgres')
  ? (await import('@payloadcms/db-postgres')).postgresAdapter({
      pool: { connectionString: databaseUri },
      // Für lokale Postgres-Entwicklung; in Produktion ignoriert Payload push.
      push: true,
      // In Produktion laufen diese Migrationen beim Start automatisch und
      // legen das Schema an. Nach Collection-Änderungen neue Migration mit
      // `pnpm payload migrate:create` erzeugen und mitcommitten.
      prodMigrations: (await import('./migrations')).migrations,
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
    RoadmapGroups,
    Media,
    Users,
  ],
  editor: lexicalEditor(),
  // E-Mail-Versand per SMTP (nur aktiv, wenn SMTP_HOST gesetzt ist — sonst
  // schreibt Payload Mails in die Konsole, praktisch für die Entwicklung).
  email: process.env.SMTP_HOST
    ? nodemailerAdapter({
        defaultFromName: process.env.EMAIL_FROM_NAME || 'LüMobil Hilfecenter',
        defaultFromAddress: process.env.EMAIL_FROM_ADDRESS || 'no-reply@swl-innovation.de',
        // Verbindung nicht bei jeder Payload-Initialisierung prüfen (das erzeugt
        // sonst bei jedem Seitenaufruf Log-Rauschen). Ein fehlerhafter SMTP-Login
        // wird beim tatsächlichen Versand erkannt und in notifyEditors geloggt.
        skipVerify: true,
        transportOptions: {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === 'true',
          auth:
            process.env.SMTP_USER || process.env.SMTP_PASS
              ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
              : undefined,
        },
      })
    : undefined,
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
