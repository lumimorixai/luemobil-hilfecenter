/** Ankommen im neuen System — Aktivierung der Abo-Berechtigten (Reporting). */
import { seiteCockpit } from '@/lib/auth/guard'
import { getReporting } from '@/lib/reporting/kennzahlen'
import type { Reporting } from '@/lib/reporting/types'
import { AnkommenSection, Seitenkopf } from '@/components/cockpit/bausteine'

export const dynamic = 'force-dynamic'

export default async function AnkommenSeite() {
  await seiteCockpit('/cockpit/ankommen')

  let reporting: Reporting = { verfuegbar: false, grund: 'nicht konfiguriert' }
  try {
    reporting = await getReporting()
  } catch {
    reporting = { verfuegbar: false, grund: 'nicht erreichbar' }
  }

  const stand = reporting.verfuegbar
    ? new Date(reporting.stand).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' Uhr'
    : 'nicht verfügbar'

  return (
    <>
      <Seitenkopf
        titel="Ankommen im neuen System"
        unterzeile={`Wie viele der Abo-Berechtigten die App wirklich nutzen · Reporting, abgefragt ${stand}`}
      />
      <AnkommenSection data={reporting} />
    </>
  )
}
