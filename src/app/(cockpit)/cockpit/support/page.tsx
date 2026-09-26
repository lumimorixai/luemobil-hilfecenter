/** Support — was im Servicecenter ankommt: Passwort, Verifizierung, Apps. */
import { seiteCockpit } from '@/lib/auth/guard'
import { getOperations } from '@/lib/cockpit/stats'
import type { Operations } from '@/lib/cockpit/types'
import { OpsSection, Seitenkopf, Unavailable } from '@/components/cockpit/bausteine'

export const dynamic = 'force-dynamic'

export default async function SupportSeite() {
  await seiteCockpit('/cockpit/support')

  let ops: Operations | null = null
  try {
    ops = await getOperations()
  } catch {
    ops = null
  }

  return (
    <>
      <Seitenkopf
        titel="Support"
        unterzeile="Konto und Passwort · Tageswerte aus der eigenen Datenbank, darunter die Summe über sieben Tage"
      />
      {ops ? <OpsSection ops={ops} /> : <Unavailable />}
    </>
  )
}
