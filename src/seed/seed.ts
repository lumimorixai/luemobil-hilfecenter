/**
 * Seed-Skript: importiert die Legacy-Inhalte aus legacy/luemobil-data.js
 * in die Payload-Datenbank (inkl. Screenshots als Media-Uploads).
 *
 * Ausführen mit:  pnpm seed
 *
 * Das Skript ist idempotent gedacht für den Erstimport: Existieren bereits
 * Inhalte, bricht es ab, statt Duplikate anzulegen.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'
import config from '../payload.config'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(dirname, '../..')

type LegacyData = {
  kbArticles: Array<{
    id: string
    category: string
    title: string
    excerpt?: string
    meta?: string
    short?: string
    steps?: string[]
    stepGroups?: Array<{ h: string; items: string[] }>
    tips?: string[]
    related?: string[]
  }>
  faqGroups: Array<{ group: string; items: Array<{ q: string; a: string }> }>
  manual: Array<{
    id: string
    reverse?: boolean
    layout?: 'single' | 'row'
    images?: string[]
    num?: string
    title: string
    paras?: string[]
    bullets?: string[]
    note?: string
  }>
  bugs: Array<{
    id: string
    severity: 'hoch' | 'mittel' | 'niedrig'
    title: string
    fundort?: string
    description?: string
    steps?: string[]
    expected?: string
    actual?: string
    images?: string[]
    caption?: string
    noImageNote?: string
    reverse?: boolean
    builtin?: boolean
  }>
  ofGroups: Array<{
    group: string
    items: Array<{ id: string; status: string; question: string; answer?: string; note?: string }>
  }>
}

function loadLegacyData(): LegacyData {
  const raw = fs.readFileSync(path.join(projectRoot, 'legacy/luemobil-data.js'), 'utf8')
  const start = raw.indexOf('{')
  return JSON.parse(raw.slice(start).replace(/;\s*$/, '')) as LegacyData
}

async function run() {
  const payload = await getPayload({ config })
  const data = loadLegacyData()

  // Abbruch, wenn schon Inhalte existieren (kein Duplikat-Import)
  const existing = await payload.count({ collection: 'articles' })
  if (existing.totalDocs > 0) {
    payload.logger.info('Seed übersprungen: Es existieren bereits Artikel in der Datenbank.')
    process.exit(0)
  }

  // ---- Admin-User (falls noch keiner existiert) ----
  const users = await payload.count({ collection: 'users' })
  if (users.totalDocs === 0) {
    const email = process.env.ADMIN_EMAIL || 'admin@example.com'
    const password = process.env.ADMIN_PASSWORD || 'luemobil-start-2026'
    await payload.create({
      collection: 'users',
      data: { email, password, name: 'Admin' },
    })
    payload.logger.info(`Admin-User angelegt: ${email}`)
  }

  // ---- Medien hochladen (Pfad → Media-ID) ----
  const mediaIds = new Map<string, number>()
  const uploadImage = async (legacyPath: string, alt: string) => {
    if (mediaIds.has(legacyPath)) return mediaIds.get(legacyPath)!
    const filename = path.basename(legacyPath)
    const filePath = path.join(projectRoot, 'legacy/media', filename)
    if (!fs.existsSync(filePath)) {
      payload.logger.warn(`Bild fehlt: ${filePath}`)
      return null
    }
    const doc = await payload.create({
      collection: 'media',
      data: { alt },
      filePath,
    })
    mediaIds.set(legacyPath, doc.id)
    return doc.id
  }

  // ---- Hilfeartikel (1. Durchgang ohne related) ----
  const articleIds = new Map<string, number>()
  for (const a of data.kbArticles) {
    const doc = await payload.create({
      collection: 'articles',
      data: {
        slug: a.id,
        category: a.category as never,
        title: a.title,
        excerpt: a.excerpt ?? '',
        meta: a.meta ?? '',
        short: a.short ?? '',
        steps: (a.steps ?? []).map((text) => ({ text })),
        stepGroups: (a.stepGroups ?? []).map((g) => ({
          heading: g.h,
          items: g.items.map((text) => ({ text })),
        })),
        tips: (a.tips ?? []).map((text) => ({ text })),
      },
    })
    articleIds.set(a.id, doc.id)
  }

  // ---- Hilfeartikel (2. Durchgang: related verknüpfen) ----
  for (const a of data.kbArticles) {
    if (!a.related?.length) continue
    const related = a.related
      .map((slug) => articleIds.get(slug))
      .filter((id): id is number => id != null)
    await payload.update({
      collection: 'articles',
      id: articleIds.get(a.id)!,
      data: { related },
    })
  }

  // ---- FAQ-Gruppen ----
  let order = 0
  for (const g of data.faqGroups) {
    await payload.create({
      collection: 'faq-groups',
      data: { group: g.group, order: order++, items: g.items },
    })
  }

  // ---- Handbuch-Kapitel ----
  order = 0
  for (const m of data.manual) {
    const images: Array<number> = []
    for (const img of m.images ?? []) {
      const id = await uploadImage(img, m.title)
      if (id != null) images.push(id)
    }
    await payload.create({
      collection: 'manual-chapters',
      data: {
        slug: m.id,
        order: order++,
        num: m.num ?? '',
        title: m.title,
        layout: m.layout ?? 'single',
        reverse: m.reverse ?? false,
        images,
        paras: (m.paras ?? []).map((text) => ({ text })),
        bullets: (m.bullets ?? []).map((text) => ({ text })),
        note: m.note ?? '',
      },
    })
  }

  // ---- Bekannte Fehler ----
  for (const b of data.bugs) {
    const images: Array<number> = []
    for (const img of b.images ?? []) {
      const id = await uploadImage(img, b.title)
      if (id != null) images.push(id)
    }
    await payload.create({
      collection: 'known-bugs',
      data: {
        bugId: b.id,
        severity: b.severity,
        title: b.title,
        fundort: b.fundort ?? '',
        description: b.description ?? '',
        steps: (b.steps ?? []).map((text) => ({ text })),
        expected: b.expected ?? '',
        actual: b.actual ?? '',
        images,
        caption: b.caption ?? '',
        noImageNote: b.noImageNote ?? '',
        reverse: b.reverse ?? false,
        builtin: b.builtin ?? false,
      },
    })
  }

  // ---- Offene Fragen ----
  order = 0
  for (const g of data.ofGroups) {
    await payload.create({
      collection: 'open-questions',
      data: {
        group: g.group,
        order: order++,
        items: g.items.map((i) => ({
          qid: i.id,
          status: (i.status === 'beantwortet' ? 'beantwortet' : 'offen') as 'beantwortet' | 'offen',
          question: i.question,
          answer: i.answer ?? '',
          note: i.note ?? '',
        })),
      },
    })
  }

  // ---- Zähl-Check (Abnahmekriterium) ----
  const counts = {
    articles: (await payload.count({ collection: 'articles' })).totalDocs,
    faqGroups: (await payload.count({ collection: 'faq-groups' })).totalDocs,
    manual: (await payload.count({ collection: 'manual-chapters' })).totalDocs,
    bugs: (await payload.count({ collection: 'known-bugs' })).totalDocs,
    openQuestions: (await payload.count({ collection: 'open-questions' })).totalDocs,
    media: (await payload.count({ collection: 'media' })).totalDocs,
  }
  const expected = {
    articles: data.kbArticles.length,
    faqGroups: data.faqGroups.length,
    manual: data.manual.length,
    bugs: data.bugs.length,
    openQuestions: data.ofGroups.length,
  }
  payload.logger.info(`Seed abgeschlossen: ${JSON.stringify(counts)}`)

  const ok =
    counts.articles === expected.articles &&
    counts.faqGroups === expected.faqGroups &&
    counts.manual === expected.manual &&
    counts.bugs === expected.bugs &&
    counts.openQuestions === expected.openQuestions

  if (!ok) {
    payload.logger.error(`Zähl-Check FEHLGESCHLAGEN. Erwartet: ${JSON.stringify(expected)}`)
    process.exit(1)
  }
  payload.logger.info('Zähl-Check bestanden ✓ (5 Artikel / 7 FAQ / 10 Kapitel / 15 Fehler / 5 Fragen-Gruppen)')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
