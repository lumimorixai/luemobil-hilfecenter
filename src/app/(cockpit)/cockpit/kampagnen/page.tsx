/** Kampagnen — Kontaktaktionen anlegen, Zielgruppe festlegen, Listen erzeugen. */
import { seiteCockpit } from '@/lib/auth/guard'
import { payloadClient } from '@/lib/content'
import { Seitenkopf } from '@/components/cockpit/bausteine'
import { KampagnenListe, type KampagnenAnsicht } from '@/components/cockpit/KampagnenListe'

export const dynamic = 'force-dynamic'

export default async function KampagnenSeite() {
  await seiteCockpit('/cockpit/kampagnen')

  const payload = await payloadClient()
  const res = await payload.find({
    collection: 'kampagnen',
    limit: 50,
    depth: 0,
    sort: '-createdAt',
    overrideAccess: true,
  })

  const kampagnen: KampagnenAnsicht[] = res.docs.map((k) => ({
    id: k.id,
    name: k.name,
    kennung: k.kennung,
    beschreibung: k.beschreibung ?? '',
    gespraechsleitfaden: k.gespraechsleitfaden ?? '',
    kanal: k.kanal ?? 'telefon',
    status: k.status ?? 'entwurf',
    rechtsgrundlage: k.rechtsgrundlage ?? '',
    herkunft: k.herkunft ?? '',
    loeschenNachTagen: k.loeschenNachTagen ?? 90,
    maxVersuche: k.maxVersuche ?? 3,
    sperreMinuten: k.sperreMinuten ?? 15,
    regelVerknuepfung: k.regelVerknuepfung ?? 'und',
    regeln: (k.regeln ?? []).map((r) => ({
      aktiv: r.aktiv !== false,
      feld: r.feld ?? '',
      operator: r.operator ?? 'ist',
      wert: r.wert ?? '',
    })),
    ergebnisse: (k.ergebnisse ?? []).map((g) => ({
      code: g.code ?? '',
      label: g.label ?? '',
      wirkung: g.wirkung ?? 'abschluss',
      standardWiedervorlageTage: g.standardWiedervorlageTage ?? null,
      notizPflicht: Boolean(g.notizPflicht),
    })),
    faelleGesamt: k.faelleGesamt ?? 0,
    faelleOffen: k.faelleOffen ?? 0,
    faelleErledigt: k.faelleErledigt ?? 0,
    erzeugtAm: k.erzeugtAm ?? null,
  }))

  return (
    <>
      <Seitenkopf
        titel="Kampagnen"
        unterzeile="Kontaktaktionen: Zielgruppe festlegen, Liste erzeugen, Ergebnisse auswerten"
      />
      <KampagnenListe kampagnen={kampagnen} />
    </>
  )
}
