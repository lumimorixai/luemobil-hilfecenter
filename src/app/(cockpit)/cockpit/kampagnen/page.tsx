/** Kampagnen — Kontaktaktionen anlegen, Zielgruppe festlegen, Listen erzeugen. */
import { seiteCockpit } from '@/lib/auth/guard'
import { payloadClient } from '@/lib/content'
import { Seitenkopf } from '@/components/cockpit/bausteine'
import { KampagnenListe, type KampagnenAnsicht } from '@/components/cockpit/KampagnenListe'
import { LEERER_STAND, standJeKampagne } from '@/lib/kampagnen/stand'

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

  // Nachzählen statt den fortgeschriebenen Zählern zu glauben: Fälle entfallen
  // auch ohne erfasstes Ergebnis — etwa wenn beim Zuteilen auffällt, dass die
  // Person inzwischen ein Konto hat.
  let stand = new Map<string, typeof LEERER_STAND>()
  try {
    stand = await standJeKampagne(payload)
  } catch (err) {
    console.warn('[kampagnen] Stand nicht ermittelt:', (err as Error).message)
  }

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
    kontoAbgleich: k.kontoAbgleich ?? 'aus',
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
    stand: stand.get(String(k.id)) ?? LEERER_STAND,
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
