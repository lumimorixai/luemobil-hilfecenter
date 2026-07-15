import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { fetchCreateMeta, jiraConfigured, SUPPLIED_FIELD_IDS } from '@/lib/jira'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Liest die Pflichtfelder des konfigurierten Jira-Projekts aus (createmeta) und
 * zeigt sie als lesbare Seite an. So sieht man vor dem ersten Ticket, welche
 * Felder das Projekt verlangt und welche davon das Hilfecenter bereits mitsendet.
 *
 * Aufruf (nur für angemeldete Admins):  /api/jira-meta
 */
export async function GET(req: NextRequest) {
  if (!jiraConfigured()) {
    return NextResponse.json(
      { error: 'Jira ist nicht konfiguriert. Bitte JIRA_* in der .env setzen.' },
      { status: 400 },
    )
  }

  // Zugriffsschutz: nur angemeldete Payload-Nutzer:innen.
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) {
    return NextResponse.json(
      { error: 'Nicht angemeldet. Bitte zuerst im Admin-Panel anmelden.' },
      { status: 401 },
    )
  }

  let meta
  try {
    meta = await fetchCreateMeta()
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    )
  }

  const supplied = new Set(SUPPLIED_FIELD_IDS)
  const suppliesPriority = process.env.JIRA_SET_PRIORITY === 'true'
  const isSupplied = (id: string) =>
    id === 'priority' ? suppliesPriority : supplied.has(id)

  const required = meta.fields.filter((f) => f.required)
  const gaps = required.filter((f) => !isSupplied(f.fieldId) && !f.hasDefaultValue)

  const esc = (s: string) =>
    s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

  const row = (f: (typeof meta.fields)[number]) => {
    const covered = isSupplied(f.fieldId)
      ? 'wird gesendet'
      : f.hasDefaultValue
        ? 'hat Standardwert'
        : '⚠ muss befüllt werden'
    const vals = f.allowedValues?.length
      ? ` <span style="color:#666">(Werte: ${esc(f.allowedValues.slice(0, 8).join(', '))}${f.allowedValues.length > 8 ? ' …' : ''})</span>`
      : ''
    return `<tr>
      <td>${esc(f.name)}</td>
      <td><code>${esc(f.fieldId)}</code></td>
      <td>${esc(f.type || '')}</td>
      <td>${covered}${vals}</td>
    </tr>`
  }

  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="robots" content="noindex,nofollow">
<title>Jira-Pflichtfelder – ${esc(meta.project)}</title>
<style>
  body { font-family: Inter, system-ui, sans-serif; margin: 2rem auto; max-width: 860px; color: #1a1a1a; padding: 0 1rem; }
  h1 { font-size: 1.4rem; } h2 { font-size: 1.05rem; margin-top: 1.6rem; }
  table { border-collapse: collapse; width: 100%; font-size: 0.9rem; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
  th { border-bottom: 2px solid #FF8200; }
  code { background: #f5f5f5; padding: 1px 4px; border-radius: 2px; }
  .box { border: 1px solid #FF8200; border-radius: 2px; padding: 10px 12px; background: #FFF6ED; margin: 1rem 0; }
  .ok { color: #1a7f37; } .warn { color: #b3261e; }
</style></head><body>
<h1>Jira-Pflichtfelder</h1>
<p>Projekt <strong>${esc(meta.project)}</strong>, Vorgangstyp <strong>${esc(meta.issueType)}</strong>.
Ausgelesen über die Jira-Schnittstelle <code>createmeta</code>.</p>

<div class="box">
${
  gaps.length === 0
    ? '<strong class="ok">Alles abgedeckt.</strong> Alle Pflichtfelder werden vom Hilfecenter gesendet oder haben in Jira einen Standardwert. Es sollte keine zusätzliche Konfiguration nötig sein.'
    : `<strong class="warn">${gaps.length} Pflichtfeld(er) offen.</strong> Diese verlangt euer Projekt zusätzlich, das Hilfecenter sendet sie noch nicht: <strong>${gaps.map((f) => esc(f.name)).join(', ')}</strong>. Optionen: die Felder in Jira optional stellen bzw. mit Standardwert versehen — oder mir Bescheid geben, dann ergänze ich einen festen Wert im Code.`
}
</div>

<h2>Pflichtfelder (${required.length})</h2>
<table><thead><tr><th>Feld</th><th>Feld-ID</th><th>Typ</th><th>Status</th></tr></thead>
<tbody>${required.map(row).join('') || '<tr><td colspan="4">—</td></tr>'}</tbody></table>

<h2>Alle Felder (${meta.fields.length})</h2>
<table><thead><tr><th>Feld</th><th>Feld-ID</th><th>Typ</th><th>Status</th></tr></thead>
<tbody>${meta.fields.map(row).join('')}</tbody></table>
</body></html>`

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
