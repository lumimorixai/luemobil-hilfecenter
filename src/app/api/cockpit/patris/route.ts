import { NextRequest, NextResponse } from 'next/server'
import { requireCockpit } from '@/lib/auth/guard'
import { PatrisImportError, importPatrisCsv } from '@/lib/cockpit/patris'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Obergrenze für die CSV-Datei. */
const MAX_BYTES = 50 * 1024 * 1024

/**
 * Patris-CSV-Upload (nur mit Cockpit-Berechtigung). Ersetzt den gesamten Bestand der
 * Collection patris-entitlements; bei Fehlern bleibt der alte Stand erhalten.
 */
export async function POST(req: NextRequest) {
  const session = await requireCockpit()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let file: File | null = null
  try {
    const form = await req.formData()
    const f = form.get('file')
    file = f instanceof File ? f : null
  } catch {
    file = null
  }
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'Bitte eine CSV-Datei auswählen.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Die Datei ist größer als 50 MB.' }, { status: 413 })
  }
  if (!/\.csv$/i.test(file.name)) {
    return NextResponse.json({ error: 'Nur CSV-Dateien (.csv) werden unterstützt.' }, { status: 400 })
  }

  try {
    const text = await file.text()
    const result = await importPatrisCsv(text, {
      fileName: file.name.slice(0, 200),
      importedBy: session.email || session.name || session.sub,
    })
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    if (err instanceof PatrisImportError) {
      return NextResponse.json({ error: err.message }, { status: 422 })
    }
    console.error('[patris] Import fehlgeschlagen:', (err as Error).message)
    return NextResponse.json(
      { error: 'Der Import ist fehlgeschlagen. Der bisherige Datenbestand ist unverändert.' },
      { status: 500 },
    )
  }
}
