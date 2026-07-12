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
