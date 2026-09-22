import { redirect } from 'next/navigation'
import { canCockpit, canKundencheck, getCockpitSession } from '@/lib/auth/guard'
import { Kundencheck } from '@/components/cockpit/Kundencheck'

export const dynamic = 'force-dynamic'

/**
 * Kundencheck als eigener Tab auf der Startseite — dasselbe Werkzeug wie im
 * Cockpit, hier in die Seiten-Shell eingebettet. Zugriff nur mit Kundencheck-
 * Berechtigung (zusätzlich zur serverseitigen 403-Prüfung der API).
 */
export default async function KundencheckPage() {
  const session = await getCockpitSession()
  if (!session) redirect('/api/auth/login?next=/kundencheck')
  // Angemeldet, aber ohne Kundencheck-Recht → ins Cockpit (falls erlaubt), sonst Startseite.
  if (!canKundencheck(session)) redirect(canCockpit(session) ? '/cockpit' : '/')

  return (
    <div>
      <p className="lm-kicker">Support-Werkzeug</p>
      <Kundencheck />
    </div>
  )
}
