import { NextRequest, NextResponse } from 'next/server'
import { requireCockpit } from '@/lib/auth/guard'
import { KampagnenFehler } from '@/lib/kampagnen/erzeugen'
import {
  kampagneAnlegen,
  kampagneLoeschen,
  kampagneSpeichern,
  type KampagnenEingabe,
} from '@/lib/kampagnen/pflege'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KOPF = { 'Cache-Control': 'no-store' }

async function koerper(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    return (await req.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

/** Neue Kampagne anlegen. */
export async function POST(req: NextRequest) {
  const session = await requireCockpit()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await koerper(req)
  if (!body) return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })

  try {
    const bearbeiter = session.email || session.name || session.sub
    const k = await kampagneAnlegen(body as KampagnenEingabe, bearbeiter)
    return NextResponse.json({ ok: true, id: k.id }, { headers: KOPF })
  } catch (err) {
    return antwortAufFehler(err, 'angelegt')
  }
}

/** Bestehende Kampagne ändern. */
export async function PATCH(req: NextRequest) {
  const session = await requireCockpit()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await koerper(req)
  if (!body) return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  const { id, ...rest } = body
  if (id == null || id === '') {
    return NextResponse.json({ error: 'Es wurde keine Kampagne angegeben.' }, { status: 400 })
  }

  try {
    await kampagneSpeichern(id as number | string, rest as KampagnenEingabe)
    return NextResponse.json({ ok: true }, { headers: KOPF })
  } catch (err) {
    return antwortAufFehler(err, 'gespeichert')
  }
}

/** Entwurf löschen — nur ohne Fälle. */
export async function DELETE(req: NextRequest) {
  const session = await requireCockpit()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await koerper(req)
  const id = body?.id
  if (id == null || id === '') {
    return NextResponse.json({ error: 'Es wurde keine Kampagne angegeben.' }, { status: 400 })
  }

  try {
    await kampagneLoeschen(id as number | string)
    return NextResponse.json({ ok: true }, { headers: KOPF })
  } catch (err) {
    return antwortAufFehler(err, 'gelöscht')
  }
}

function antwortAufFehler(err: unknown, was: string) {
  if (err instanceof KampagnenFehler) {
    return NextResponse.json({ error: err.message }, { status: 422 })
  }
  const grund = (err as Error).message
  console.error(`[kampagnen] Kampagne nicht ${was}:`, grund)
  return NextResponse.json({ error: `Nicht ${was}: ${grund}` }, { status: 500 })
}
