import { NextRequest, NextResponse } from 'next/server'
import { getBugs, type BugData } from '@/lib/content'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Jira-CSV-Export der bekannten Fehler.
 *
 * Erzeugt eine CSV-Datei, die sich mit dem Jira-CSV-Importer als Vorgänge
 * (Issue Type „Bug“) importieren lässt — inklusive Screenshots als Anhänge
 * (Jira lädt die angegebenen Bild-URLs beim Import automatisch herunter).
 *
 * Aufruf:
 *   /api/jira-export                 → alle sichtbaren Fehler
 *   /api/jira-export?bugId=LUEMOB-003 → nur ein bestimmter Fehler
 *   /api/jira-export?status=offen     → nur Fehler mit diesem Status
 *
 * Hinweis: Damit Jira die Screenshots ziehen kann, müssen die Bild-URLs für
 * Jira erreichbar sein (also nach dem Deployment unter der öffentlichen Domain,
 * nicht unter http://localhost).
 */

function priorityFromSeverity(severity: BugData['severity']): string {
  return severity === 'hoch' ? 'High' : severity === 'mittel' ? 'Medium' : 'Low'
}

/** CSV-Feld sicher escapen (Anführungszeichen verdoppeln, in Quotes fassen). */
function csv(value: string): string {
  return `"${(value ?? '').replace(/"/g, '""')}"`
}

/** Beschreibung in Jira-Wiki-Markup zusammenbauen. */
function buildDescription(bug: BugData): string {
  const lines: string[] = []
  lines.push(`*Fehler-ID:* ${bug.bugId}`)
  lines.push(`*Status:* ${bug.state}`)
  lines.push(`*Schweregrad:* ${bug.severity}`)
  if (bug.fundort) lines.push(`*Fundort:* ${bug.fundort}`)
  lines.push('')
  if (bug.description) {
    lines.push('h3. Beschreibung')
    lines.push(bug.description)
    lines.push('')
  }
  if (bug.steps.length) {
    lines.push('h3. Schritte zur Reproduktion')
    bug.steps.forEach((s, i) => lines.push(`# ${s}`))
    lines.push('')
  }
  if (bug.expected) {
    lines.push('h3. Erwartetes Verhalten')
    lines.push(bug.expected)
    lines.push('')
  }
  if (bug.actual) {
    lines.push('h3. Tatsächliches Verhalten')
    lines.push(bug.actual)
    lines.push('')
  }
  lines.push('_Exportiert aus dem LüMobil Hilfecenter._')
  return lines.join('\n')
}

export async function GET(req: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_SERVER_URL || req.nextUrl.origin
  const bugIdFilter = req.nextUrl.searchParams.get('bugId')
  const statusFilter = req.nextUrl.searchParams.get('status')

  let bugs = await getBugs()
  if (bugIdFilter) bugs = bugs.filter((b) => b.bugId === bugIdFilter)
  if (statusFilter) bugs = bugs.filter((b) => b.state === statusFilter)

  // Absolute Bild-URLs (damit Jira sie als Anhang laden kann)
  const rows = bugs.map((b) => ({
    bug: b,
    attachments: b.images.map((img) =>
      img.url.startsWith('http') ? img.url : `${origin}${img.url}`,
    ),
  }))
  const maxAttachments = rows.reduce((m, r) => Math.max(m, r.attachments.length), 0)

  // Kopfzeile: feste Spalten + so viele „Attachment“-Spalten wie nötig
  const header = ['Summary', 'Issue Type', 'Priority', 'Labels', 'Description']
  for (let i = 0; i < maxAttachments; i++) header.push('Attachment')

  const lines = [header.map(csv).join(',')]
  for (const { bug, attachments } of rows) {
    const cells = [
      csv(`[${bug.bugId}] ${bug.title}`),
      csv('Bug'),
      csv(priorityFromSeverity(bug.severity)),
      csv(`LuMobil,${bug.state}`),
      csv(buildDescription(bug)),
    ]
    for (let i = 0; i < maxAttachments; i++) cells.push(csv(attachments[i] ?? ''))
    lines.push(cells.join(','))
  }

  // BOM voranstellen, damit Umlaute in Excel/Jira korrekt ankommen
  const body = '﻿' + lines.join('\r\n')
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="luemobil-fehler-jira.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
