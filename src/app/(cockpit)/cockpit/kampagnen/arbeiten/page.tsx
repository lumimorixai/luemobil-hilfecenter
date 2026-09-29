/** Arbeitsplatz — Fälle einer laufenden Kampagne abarbeiten. */
import { seiteCallcenter } from '@/lib/auth/guard'
import { payloadClient } from '@/lib/content'
import { Seitenkopf } from '@/components/cockpit/bausteine'
import { Arbeitsplatz, type KampagneKurz } from '@/components/cockpit/Arbeitsplatz'
import { standJeKampagne } from '@/lib/kampagnen/stand'

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

  // Die Zahl in der Auswahlliste wird gezählt, nicht dem gespeicherten Zähler
  // entnommen: Er hinkt hinterher, sobald Fälle beim Zuteilen entfallen.
  let stand = new Map<string, { offen: number; inArbeit: number }>()
  try {
    stand = await standJeKampagne(payload)
  } catch (err) {
    console.warn('[kampagnen] Stand nicht ermittelt:', (err as Error).message)
  }

  const kampagnen: KampagneKurz[] = res.docs.map((k) => ({
    id: k.id,
    name: k.name,
    kanal: k.kanal ?? 'telefon',
    gespraechsleitfaden: k.gespraechsleitfaden ?? '',
    faelleOffen: (stand.get(String(k.id))?.offen ?? 0) + (stand.get(String(k.id))?.inArbeit ?? 0),
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
