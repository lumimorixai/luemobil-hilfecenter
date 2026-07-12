import { getPayload } from 'payload'
import config from '@payload-config'

/** Payload-Instanz (gecacht durch getPayload selbst). */
export async function payloadClient() {
  return getPayload({ config })
}

export type ArticleCard = {
  slug: string
  category: string
  title: string
  excerpt: string
}

export type FaqItem = { q: string; a: string }
export type FaqGroup = { group: string; items: FaqItem[] }

export async function getArticles(): Promise<ArticleCard[]> {
  const payload = await payloadClient()
  const res = await payload.find({
    collection: 'articles',
    limit: 200,
    sort: 'createdAt',
    depth: 0,
  })
  return res.docs.map((d) => ({
    slug: d.slug,
    category: d.category,
    title: d.title,
    excerpt: d.excerpt ?? '',
  }))
}

export async function getFaqGroups(): Promise<FaqGroup[]> {
  const payload = await payloadClient()
  const res = await payload.find({
    collection: 'faq-groups',
    limit: 100,
    sort: 'order',
    depth: 0,
  })
  return res.docs.map((d) => ({
    group: d.group,
    items: (d.items ?? []).map((i) => ({ q: i.q, a: i.a })),
  }))
}

export type ImageData = { url: string; alt: string }

function shapeImages(
  images: Array<number | { id: number; url?: string | null; alt?: string | null }> | null | undefined,
  fallbackAlt: string,
): ImageData[] {
  return (images ?? [])
    .filter((img): img is { id: number; url?: string | null; alt?: string | null } =>
      typeof img === 'object' && img !== null,
    )
    .filter((img) => Boolean(img.url))
    .map((img) => ({ url: img.url as string, alt: img.alt ?? fallbackAlt }))
}

export type ManualChapter = {
  slug: string
  num: string
  title: string
  reverse: boolean
  images: ImageData[]
  paras: string[]
  bullets: string[]
  note: string
}

export async function getManualChapters(): Promise<ManualChapter[]> {
  const payload = await payloadClient()
  const res = await payload.find({
    collection: 'manual-chapters',
    limit: 100,
    sort: 'order',
    depth: 1,
  })
  return res.docs.map((d) => ({
    slug: d.slug,
    num: d.num ?? '',
    title: d.title,
    reverse: Boolean(d.reverse),
    images: shapeImages(d.images, d.title),
    paras: (d.paras ?? []).map((p) => p.text),
    bullets: (d.bullets ?? []).map((b) => b.text),
    note: d.note ?? '',
  }))
}

export type BugData = {
  bugId: string
  severity: 'hoch' | 'mittel' | 'niedrig'
  state: 'gemeldet' | 'offen' | 'behoben'
  title: string
  fundort: string
  description: string
  steps: string[]
  expected: string
  actual: string
  images: ImageData[]
  caption: string
  noImageNote: string
}

const BUG_ORDER: Record<string, number> = { hoch: 0, mittel: 1, niedrig: 2 }

export async function getBugs(): Promise<BugData[]> {
  const payload = await payloadClient()
  const res = await payload.find({
    collection: 'known-bugs',
    limit: 200,
    depth: 1,
    where: { hidden: { not_equals: true } }, // ausgeblendete Fehler nicht öffentlich zeigen
  })
  return res.docs
    .map((d) => ({
      bugId: d.bugId,
      severity: d.severity,
      state: (['gemeldet', 'offen', 'behoben'].includes(d.state) ? d.state : 'offen') as
        | 'gemeldet'
        | 'offen'
        | 'behoben',
      title: d.title,
      fundort: d.fundort ?? '',
      description: d.description ?? '',
      steps: (d.steps ?? []).map((s) => s.text),
      expected: d.expected ?? '',
      actual: d.actual ?? '',
      images: shapeImages(d.images, d.title),
      caption: d.caption ?? '',
      noImageNote: d.noImageNote ?? '',
    }))
    .sort(
      (a, b) =>
        // 1) offene vor behobenen, 2) nach Priorität, 3) nach Fehler-ID
        (a.state === 'behoben' ? 1 : 0) - (b.state === 'behoben' ? 1 : 0) ||
        (BUG_ORDER[a.severity] ?? 9) - (BUG_ORDER[b.severity] ?? 9) ||
        a.bugId.localeCompare(b.bugId),
    )
}

export type RoadmapItem = {
  title: string
  status: string
  text: string
}
export type RoadmapGroup = {
  kicker: string
  heading: string
  intro: string
  items: RoadmapItem[]
}

type RoadmapDoc = {
  kicker?: string | null
  heading: string
  intro?: string | null
  items?: Array<{ title: string; status?: string | null; text?: string | null }> | null
}

export async function getRoadmapGroups(): Promise<RoadmapGroup[]> {
  const payload = await payloadClient()
  // Slug per Assertion – macht den Build unabhängig vom Stand der generierten
  // payload-types.ts (die Collection existiert zur Laufzeit in der Config).
  const res = await payload.find({
    collection: 'roadmap' as unknown as 'media',
    limit: 100,
    sort: 'order',
    depth: 0,
  })
  const docs = res.docs as unknown as RoadmapDoc[]
  return docs.map((d) => ({
    kicker: d.kicker ?? '',
    heading: d.heading,
    intro: d.intro ?? '',
    items: (d.items ?? []).map((i) => ({
      title: i.title,
      status: i.status ?? 'geplant',
      text: i.text ?? '',
    })),
  }))
}

export type OpenQuestionItem = {
  qid: string
  status: 'offen' | 'beantwortet'
  question: string
  answer: string
  note: string
}
export type OpenQuestionGroup = { group: string; items: OpenQuestionItem[] }

export async function getOpenQuestionGroups(): Promise<OpenQuestionGroup[]> {
  const payload = await payloadClient()
  const res = await payload.find({
    collection: 'open-questions',
    limit: 100,
    sort: 'order',
    depth: 0,
  })
  return res.docs.map((d) => ({
    group: d.group,
    items: (d.items ?? []).map((i) => ({
      qid: i.qid,
      status: i.status,
      question: i.question,
      answer: i.answer ?? '',
      note: i.note ?? '',
    })),
  }))
}
