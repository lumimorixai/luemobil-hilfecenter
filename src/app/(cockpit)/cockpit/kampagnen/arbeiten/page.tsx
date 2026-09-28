/** Arbeitsplatz — Fälle einer laufenden Kampagne abarbeiten. */
import { seiteCallcenter } from '@/lib/auth/guard'
import { payloadClient } from '@/lib/content'
import { Seitenkopf } from '@/components/cockpit/bausteine'
import { Arbeitsplatz, type KampagneKurz } from '@/components/cockpit/Arbeitsplatz'

export const dynamic = 'force-dynamic'

export default async function ArbeitsplatzSeite() {
  await seiteCallcenter('/cockpit/kampagnen/arbeiten')

  const payload = await payloadClient()
  // Nur aktive Kampagnen: Entwürfe und beendete geben keine Fälle aus, und
  // eine Auswahlliste voller unbrauchbarer Einträge hilft niemandem.
  const res = await payload.find({
    collection: 'kampagnen',
    where: { status: { equals: 'aktiv' } },
    limit: 20,
    depth: 0,
    sort: 'name',
    overrideAccess: true,
  })

  const kampagnen: KampagneKurz[] = res.docs.map((k) => ({
    id: k.id,
    name: k.name,
    kanal: k.kanal ?? 'telefon',
    gespraechsleitfaden: k.gespraechsleitfaden ?? '',
    faelleOffen: k.faelleOffen ?? 0,
    ergebnisse: (k.ergebnisse ?? []).map((e) => ({
      code: e.code ?? '',
      label: e.label ?? '',
      wirkung: e.wirkung ?? 'abschluss',
      standardWiedervorlageTage: e.standardWiedervorlageTage ?? null,
      notizPflicht: Boolean(e.notizPflicht),
    })),
  }))

  return (
    <>
      <Seitenkopf
        titel="Fälle abarbeiten"
        unterzeile="Einen Fall zuteilen lassen, bearbeiten, Ergebnis festhalten"
      />
      <Arbeitsplatz kampagnen={kampagnen} />
    </>
  )
}
