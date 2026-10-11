import { NextResponse } from 'next/server'
import { requireCockpit } from '@/lib/auth/guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Welche Inhalts-Zielzustände sich einspielen lassen. */
const JOBS = ['handbuch-v2'] as const
type Job = (typeof JOBS)[number]

/**
 * Inhalts-Updates in Produktion einspielen — aus dem Cockpit, nur mit Rolle
 * cockpit (oder support).
 *
 * Hintergrund: Redaktionelle Zielzustände wie das Handbuch zur App-Version 2
 * stehen als Skript im Quelltext (src/seed/handbuch-v2.ts). Lokal läuft das per
 * `pnpm handbuch:v2`; in Produktion gibt es keine CLI, weil das Image ein
 * Standalone-Build ohne pnpm, tsx und Quelltext ist. Deshalb derselbe Code hier
 * über HTTP erreichbar — wie bei den Cron-Jobs.
 *
 * Die Läufe sind idempotent: Sie schreiben vorhandene Kapitel auf den
 * festgelegten Zielzustand und legen fehlende an. Gelöscht wird nichts, und
 * ein zweiter Lauf ändert nichts mehr.
 */
export async function POST(req: Request) {
  const session = await requireCockpit()
  if (!session) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let body: { job?: unknown; ohneBilder?: unknown } = {}
  try {
    body = (await req.json()) ?? {}
  } catch {
    // Leerer Body ist in Ordnung — unten greift die Prüfung auf den Job.
  }
  const job = body.job
  if (typeof job !== 'string' || !JOBS.includes(job as Job)) {
    return NextResponse.json({ error: 'bad_job', erlaubt: JOBS }, { status: 400 })
  }

  try {
    // Erst bei Bedarf laden: Der Zielzustand samt Texten muss nicht in jedem
    // Server-Start stecken.
    const { handbuchAktualisieren } = await import('@/seed/handbuch-v2')
    const erg = await handbuchAktualisieren(body.ohneBilder !== true)
    return NextResponse.json({ ok: true, job, ...erg })
  } catch (err) {
    return NextResponse.json(
      { error: 'job_failed', detail: (err as Error).message },
      { status: 502 },
    )
  }
}
