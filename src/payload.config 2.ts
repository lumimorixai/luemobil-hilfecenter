import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { de } from '@payloadcms/translations/languages/de'
import { en } from '@payloadcms/translations/languages/en'
import sharp from 'sharp'

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

const db = databaseUri.startsWith('postgres')
  ? postgresAdapter({ pool: { connectionString: databaseUri } })
  : sqliteAdapter({ client: { url: databaseUri } })

export default buildConfig({
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: ' · LüMobil Hilfecenter',
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
})
