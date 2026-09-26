/** Tickets und Umsatz — Bestellungen aus der App (Reporting). */
import { seiteCockpit } from '@/lib/auth/guard'
import { getReporting } from '@/lib/reporting/kennzahlen'
import type { Reporting } from '@/lib/reporting/types'
import { Seitenkopf, UmsatzSection } from '@/components/cockpit/bausteine'

export const dynamic = 'force-dynamic'

export default async function UmsatzSeite() {
  await seiteCockpit('/cockpit/umsatz')

  let reporting: Reporting = { verfuegbar: false, grund: 'nicht konfiguriert' }
  try {
    reporting = await getReporting()
  } catch {
    reporting = { verfuegbar: false, grund: 'nicht erreichbar' }
  }

  return (
    <>
      <Seitenkopf
        titel="Tickets und Umsatz"
        unterzeile="Bestellungen aus der App · Quelle: Reporting, nachts aufgebaut"
      />
      <UmsatzSection data={reporting} />
    </>
  )
}
