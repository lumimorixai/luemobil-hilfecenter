import { NextRequest, NextResponse } from 'next/server'
import { requireCockpit } from '@/lib/auth/guard'
import { KampagnenFehler, ermittleFaelle, faelleErzeugen } from '@/lib/kampagnen/erzeugen'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Fälle einer Kampagne erzeugen — oder mit `probe: true` nur durchrechnen.
 *
 * Der Trockenlauf ist kein Komfort, sondern Pflichtprogramm: Wer eine Liste
 * mit mehreren tausend Personen anlegt, muss vorher sehen, wie viele es werden
 * und wer warum herausfällt. Beide Wege rechnen mit demselben Code.
 */
export async function POST(req: NextRequest) {
  const session = await requireCockpit()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let body: { kampagne?: number | string; probe?: boolean } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }
  if (body.kampagne == null || body.kampagne === '') {
    return NextResponse.json({ error: 'Es wurde keine Kampagne angegeben.' }, { status: 400 })
  }

  const kopf = { 'Cache-Control': 'no-store' }
  try {
    if (body.probe) {
      const { bilanz } = await ermittleFaelle(body.kampagne)
      return NextResponse.json({ ok: true, probe: true, bilanz }, { headers: kopf })
    }
    const bearbeiter = session.email || session.name || session.sub
    const bilanz = await faelleErzeugen(body.kampagne, bearbeiter)
    console.info(
      `[kampagnen] ${bilanz.neu} Fälle erzeugt für Kampagne ${body.kampagne} durch ${bearbeiter}`,
    )
    return NextResponse.json({ ok: true, probe: false, bilanz }, { headers: kopf })
  } catch (err) {
    if (err instanceof KampagnenFehler) {
      return NextResponse.json({ error: err.message }, { status: 422 })
    }
    const grund = (err as Error).message
    console.error('[kampagnen] Listenerzeugung fehlgeschlagen:', grund)
    return NextResponse.json(
      { error: `Die Liste konnte nicht erzeugt werden: ${grund}` },
      { status: 500 },
    )
  }
}
