/**
 * Kern-Import der Legacy-Inhalte in eine vorhandene Payload-Instanz.
 * Wird sowohl vom CLI-Skript (`pnpm seed`) als auch beim Container-Start
 * (onInit, gesteuert über SEED_ON_INIT) verwendet.
 *
 * Idempotent: Existieren bereits Artikel, passiert nichts.
 */
import fs from 'fs'
import path from 'path'
import type { Payload } from 'payload'

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

export type SeedOptions = {
  /** Verzeichnis mit luemobil-data.js und media/ (Standard: <cwd>/legacy). */
  legacyDir?: string
  adminEmail?: string
  adminPassword?: string
}

export type SeedResult =
  | { seeded: false; reason: 'already-populated' }
  | {
      seeded: true
      counts: Record<string, number>
      ok: boolean
    }

/** Startinhalte für die Seite „Ausblick auf Version 2“. */
const ROADMAP_GROUPS: Array<{
  kicker: string
  heading: string
  intro: string
  items: Array<{ title: string; status: 'geplant' | 'in Prüfung' | 'in Vorbereitung'; text: string }>
}> = [
  {
    kicker: 'Tickets & Bezahlen',
    heading: 'Tickets direkt in der App kaufen',
    intro:
      'Der größte Schritt für Version 2: Fahrscheine direkt in LüMobil erwerben und im Konto verwalten. Der Start erfolgt zunächst in der Region Lübeck; die Zahlungsabwicklung übernimmt der Zahldienstleister Payone (über die Sparkasse zu Lübeck).',
    items: [
      { title: 'Direkter Ticketkauf (Einzel- und Monatstickets)', status: 'geplant', text: 'Einzel- und Monatstickets werden direkt in der App gekauft.' },
      { title: 'Deutschlandticket', status: 'geplant', text: 'Das Deutschlandticket wird nicht direkt in der App gekauft, sondern über die AboOnline-Bestellstrecke bestellt und anschließend im Konto hinterlegt.' },
      { title: 'Bezahlarten', status: 'geplant', text: 'Gängige Bezahlarten: Apple Pay, Google Pay, Kreditkarte und Wero.' },
      { title: 'Start in der Region Lübeck', status: 'geplant', text: 'Zunächst nur Ticketverkauf in der Region Lübeck.' },
      { title: 'Ablösung der FährTic-App', status: 'geplant', text: 'Die bisherige FährTic-App wird abgelöst; der Ticketverkauf erfolgt künftig über die LüMobil-App.' },
    ],
  },
  {
    kicker: 'Echtzeitdaten',
    heading: 'Einbindung der Echtzeitdaten',
    intro: 'Live-Informationen zum Fahrbetrieb direkt in der App.',
    items: [
      { title: 'Füllstandsanzeige für die Busse', status: 'geplant', text: 'Anzeige der aktuellen Auslastung der Busse.' },
      { title: 'Anzeige der Busse auf der Karte', status: 'geplant', text: 'Darstellung der fahrenden Busse in Echtzeit auf der Karte.' },
      { title: 'Auslastungsprognose', status: 'geplant', text: 'Prognose, wie voll der kommende Bus voraussichtlich sein wird.' },
    ],
  },
  {
    kicker: 'Störungen & Kommunikation',
    heading: 'Live-Informationen bei Störungen',
    intro:
      'Die aktuell extern eingebundene Störungsübersicht soll fester Bestandteil der App werden — mit aktiver Benachrichtigung statt passivem Nachschlagen.',
    items: [
      { title: 'Integrierte Störungsanzeige', status: 'geplant', text: 'Störungen und Ausfälle direkt in der Verbindungssuche und auf der Startseite, abgestimmt auf die eigene Route.' },
      { title: 'Push-Benachrichtigungen', status: 'geplant', text: 'Optionale Hinweise, wenn auf einer gespeicherten Linie oder Lieblingsverbindung eine Störung auftritt.' },
    ],
  },
  {
    kicker: 'Anliegen & Support',
    heading: 'Fragen und Meldungen schneller bearbeiten',
    intro: 'Engere Verzahnung der in Version 1 eingeführten Formulare mit den internen Abläufen.',
    items: [
      { title: 'Anliegen-Routing', status: 'geplant', text: 'Eingereichte Fragen und Meldungen werden automatisch an die zuständige Stelle geleitet.' },
    ],
  },
  {
    kicker: 'Weiteres',
    heading: 'Datenqualität, Sicherheit und CRM',
    intro: 'Anbindung weiterer Dienste rund um Kundendaten und Sicherheit.',
    items: [
      { title: 'Adressvalidierung', status: 'geplant', text: 'Einbindung des Endereco-Service zur Prüfung von Adressen.' },
      { title: 'Betrugsprävention', status: 'geplant', text: 'Einbindung von Cosmo Fraud Detection.' },
      { title: 'Buchungszentrum & CRM', status: 'geplant', text: 'Anbindung von Buchungszentrum und CRM für Kundendaten, Transaktionsdaten und Störungsinformationen.' },
    ],
  },
]

/** Ausblick-Blöcke importieren, falls die Collection noch leer ist (eigener Guard). */
async function seedRoadmap(payload: Payload) {
  const existing = await payload.count({ collection: 'roadmap' })
  if (existing.totalDocs > 0) return
  let order = 0
  for (const g of ROADMAP_GROUPS) {
    await payload.create({
      collection: 'roadmap',
      data: { order: order++, kicker: g.kicker, heading: g.heading, intro: g.intro, items: g.items },
    })
  }
  payload.logger.info(`Ausblick V2: ${ROADMAP_GROUPS.length} Blöcke importiert.`)
}

export async function seedDatabase(payload: Payload, opts: SeedOptions = {}): Promise<SeedResult> {
  const legacyDir = opts.legacyDir ?? path.join(process.cwd(), 'legacy')

  // Ausblick-Blöcke unabhängig vom übrigen Inhalt sicherstellen (auch nachträglich).
  await seedRoadmap(payload)

  // Abbruch, wenn schon Inhalte existieren (kein Duplikat-Import)
  const existing = await payload.count({ collection: 'articles' })
  if (existing.totalDocs > 0) {
    payload.logger.info('Seed übersprungen: Es existieren bereits Artikel in der Datenbank.')
    return { seeded: false, reason: 'already-populated' }
  }

  const raw = fs.readFileSync(path.join(legacyDir, 'luemobil-data.js'), 'utf8')
  const data = JSON.parse(raw.slice(raw.indexOf('{')).replace(/;\s*$/, '')) as LegacyData

  // ---- Admin-User (falls noch keiner existiert) ----
  const users = await payload.count({ collection: 'users' })
  if (users.totalDocs === 0) {
    const email = opts.adminEmail || process.env.ADMIN_EMAIL || 'admin@example.com'
    const password = opts.adminPassword || process.env.ADMIN_PASSWORD || 'luemobil-start-2026'
    await payload.create({ collection: 'users', data: { email, password, name: 'Admin' } })
    payload.logger.info(`Admin-User angelegt: ${email}`)
  }

  // ---- Medien hochladen (Pfad → Media-ID) ----
  const mediaIds = new Map<string, number>()
  const uploadImage = async (legacyPath: string, alt: string) => {
    if (mediaIds.has(legacyPath)) return mediaIds.get(legacyPath)!
    const filePath = path.join(legacyDir, 'media', path.basename(legacyPath))
    if (!fs.existsSync(filePath)) {
      payload.logger.warn(`Bild fehlt: ${filePath}`)
      return null
    }
    const doc = await payload.create({ collection: 'media', data: { alt }, filePath })
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
    await payload.update({ collection: 'articles', id: articleIds.get(a.id)!, data: { related } })
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
        state: 'offen',
        hidden: false,
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

  const counts = {
    articles: (await payload.count({ collection: 'articles' })).totalDocs,
    faqGroups: (await payload.count({ collection: 'faq-groups' })).totalDocs,
    manual: (await payload.count({ collection: 'manual-chapters' })).totalDocs,
    bugs: (await payload.count({ collection: 'known-bugs' })).totalDocs,
    openQuestions: (await payload.count({ collection: 'open-questions' })).totalDocs,
    media: (await payload.count({ collection: 'media' })).totalDocs,
  }
  const ok =
    counts.articles === data.kbArticles.length &&
    counts.faqGroups === data.faqGroups.length &&
    counts.manual === data.manual.length &&
    counts.bugs === data.bugs.length &&
    counts.openQuestions === data.ofGroups.length

  payload.logger.info(`Seed abgeschlossen: ${JSON.stringify(counts)} (Zähl-Check ${ok ? 'ok' : 'FEHLER'})`)
  return { seeded: true, counts, ok }
}
