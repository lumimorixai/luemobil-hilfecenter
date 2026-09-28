import { NextRequest, NextResponse } from 'next/server'
import { requireCallcenter } from '@/lib/auth/guard'
import { KampagnenFehler } from '@/lib/kampagnen/erzeugen'
import { ergebnisErfassen, fallFreigeben, naechsterFall } from '@/lib/kampagnen/arbeiten'
import { zaehlerAktualisieren } from '@/lib/kampagnen/erzeugen'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KOPF = { 'Cache-Control': 'no-store' }

/**
 * Der Arbeitsplatz. Eine Route, drei Vorgänge — `was` entscheidet:
 *
 * - `naechster`: Fall zuteilen (sperrt ihn für die Haltefrist)
 * - `ergebnis`:  Ergebnis erfassen und Fall fortschreiben
 * - `freigeben`: zugeteilten Fall ohne Ergebnis zurückgeben
 */
export async function POST(req: NextRequest) {
  const session = await requireCallcenter()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let body: {
    was?: string
    kampagne?: number | string
    fall?: number | string
    ergebnis?: string
    notiz?: string
    wiedervorlageAm?: string | null
    dauerSekunden?: number | null
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const kennung = session.sub
  const name = session.name || session.email || session.sub

  try {
    if (body.was === 'naechster') {
      if (body.kampagne == null) {
        return NextResponse.json({ error: 'Es wurde keine Kampagne angegeben.' }, { status: 400 })
      }
      const zuteilung = await naechsterFall(body.kampagne, kennung)
      return NextResponse.json({ ok: true, ...zuteilung }, { headers: KOPF })
    }

    if (body.was === 'ergebnis') {
      if (body.fall == null || !body.ergebnis) {
        return NextResponse.json({ error: 'Fall oder Ergebnis fehlt.' }, { status: 400 })
      }
      const { wirkung } = await ergebnisErfassen(
        {
          fall: body.fall,
          ergebnis: body.ergebnis,
          notiz: body.notiz,
          wiedervorlageAm: body.wiedervorlageAm ?? null,
          dauerSekunden: body.dauerSekunden ?? null,
        },
        { kennung, name },
      )
      // Die Zähler an der Kampagne gleich mitziehen, damit die Leitung den
      // Fortschritt sieht, ohne auf den Nachtjob zu warten.
      if (body.kampagne != null) {
        try {
          await zaehlerAktualisieren(body.kampagne)
        } catch (err) {
          console.warn('[kampagnen] Zähler nicht aktualisiert:', (err as Error).message)
        }
      }
      return NextResponse.json({ ok: true, wirkung }, { headers: KOPF })
    }

    if (body.was === 'freigeben') {
      if (body.fall == null) {
        return NextResponse.json({ error: 'Es wurde kein Fall angegeben.' }, { status: 400 })
      }
      await fallFreigeben(body.fall, kennung)
      return NextResponse.json({ ok: true }, { headers: KOPF })
    }

    return NextResponse.json({ error: 'Unbekannter Vorgang.' }, { status: 400 })
  } catch (err) {
    if (err instanceof KampagnenFehler) {
      return NextResponse.json({ error: err.message }, { status: 422 })
    }
    const grund = (err as Error).message
    console.error('[kampagnen] Arbeitsplatz-Fehler:', grund)
    return NextResponse.json({ error: `Das hat nicht geklappt: ${grund}` }, { status: 500 })
  }
}
