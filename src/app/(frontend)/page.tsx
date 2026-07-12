import React from 'react'
import { HelpCenter } from '@/components/HelpCenter'
import { getArticles, getFaqGroups } from '@/lib/content'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [articles, faqGroups] = await Promise.all([getArticles(), getFaqGroups()])
  return <HelpCenter articles={articles} faqGroups={faqGroups} />
}
