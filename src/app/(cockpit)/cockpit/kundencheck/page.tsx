/** Kundencheck — Auskunft zu einer einzelnen Person. */
import { seiteKundencheck } from '@/lib/auth/guard'
import { Kundencheck } from '@/components/cockpit/Kundencheck'
import { Seitenkopf } from '@/components/cockpit/bausteine'

export const dynamic = 'force-dynamic'

export default async function KundencheckSeite() {
  await seiteKundencheck('/cockpit/kundencheck')
  return (
    <>
      <Seitenkopf
        titel="Kundencheck"
        unterzeile="Auskunft zu einer einzelnen Person · Suchanfragen werden nicht protokolliert"
      />
      <Kundencheck />
    </>
  )
}
