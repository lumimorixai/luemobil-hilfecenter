import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * Die Kennzahlen-Seite ist im Cockpit aufgegangen (Bereich „Auswertungen").
 * Diese Adresse bleibt als Weiterleitung bestehen; ein angefragtes Dashboard
 * (?d=…) wird mitgenommen.
 */
export default async function KennzahlenWeiterleitung({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>
}) {
  const { d } = await searchParams
  redirect(d ? `/cockpit/dashboards?d=${encodeURIComponent(d)}` : '/cockpit/dashboards')
}
