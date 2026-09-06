import { redirect } from 'next/navigation'
import { getCockpitSession, isSupport } from '@/lib/auth/guard'
import { Kundencheck } from '@/components/cockpit/Kundencheck'

export const dynamic = 'force-dynamic'

/**
 * Kundencheck als eigener Tab auf der Startseite — dasselbe Werkzeug wie im
 * Cockpit, hier in die Seiten-Shell eingebettet. Zugriff nur mit Support-Rolle
 * (zusätzlich zur serverseitigen 403-Prüfung der API).
 */
export default async function KundencheckPage() {
  const session = await getCockpitSession()
  if (!session) redirect('/api/auth/login?next=/kundencheck')
  if (!isSupport(session)) redirect('/') // angemeldet, aber ohne Rolle

  return (
    <div>
      <p className="lm-kicker">Support-Werkzeug</p>
      <Kundencheck />
    </div>
  )
}
