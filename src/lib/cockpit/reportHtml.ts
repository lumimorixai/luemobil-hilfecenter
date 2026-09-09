/**
 * HTML-Body des Cockpit-Reports (E-Mail). Bewusst tabellenbasiert mit Inline-
 * Styles, damit es in allen Mailclients (Outlook, Gmail, Apple Mail) robust
 * rendert. Grafik über einfache Balken (verschachtelte Tabellenzellen mit
 * Hintergrundfarbe) — die vollständigen Diagramme liegen im PDF-Anhang.
 * Design: Hilfecenter-/SWL-Tokens (Schwarz-Header, Orange-Akzent, 2px-Kanten).
 */
import { de } from './chartMath'
import type { ReportData } from './report'

const ORANGE = '#ff8200'
const INK = '#000000'
const HAIR = '#cfcfcf'
const GRAY = '#e4e4e4'
const MUTED = '#7a7474'
const GREEN = '#00aa32'
const PINK = '#f73e5e'
const MUTEDBG = '#f8f8f8'

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Horizontaler Balken 0–100 % (mailclient-sicher über zwei Tabellenzellen). */
function bar(pct: number, color: string): string {
  const p = Math.max(0, Math.min(100, Math.round(pct)))
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>` +
    `<td width="${p}%" style="background:${color};height:8px;font-size:0;line-height:0">&nbsp;</td>` +
    `<td width="${100 - p}%" style="background:${GRAY};height:8px;font-size:0;line-height:0">&nbsp;</td>` +
    `</tr></table>`
  )
}

function kpiCell(n: string, label: string, color = INK): string {
  return (
    `<td width="33%" style="border:1px solid ${HAIR};padding:10px 12px;vertical-align:top">` +
    `<div style="font-size:22px;font-weight:800;color:${color};line-height:1.1">${n}</div>` +
    `<div style="font-size:11px;color:${MUTED};margin-top:3px">${esc(label)}</div>` +
    `</td>`
  )
}

export function buildReportHtml(data: ReportData): string {
  const k = data.kpis
  const rate = k.errorRatePct.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  const availRows = data.availability
    .map((a) => {
      const color = !a.configured ? MUTED : a.uptimePct >= 99.5 ? GREEN : a.uptimePct >= 95 ? ORANGE : PINK
      const val = a.configured
        ? `${a.uptimePct.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
        : 'n/a'
      const sub = a.configured
        ? `${a.outages === 0 ? 'keine Störungen' : a.outages + ' Störfenster'}`
        : 'nicht konfiguriert'
      return (
        `<tr>` +
        `<td style="padding:7px 0;font-size:13px;font-weight:600;width:40%">${esc(a.label)}</td>` +
        `<td style="padding:7px 8px;font-size:13px;font-weight:700;color:${color};text-align:right;width:20%">${val}</td>` +
        `<td style="padding:7px 0;width:40%">${bar(a.configured ? a.uptimePct : 0, color)}` +
        `<div style="font-size:10px;color:${MUTED};margin-top:2px">${esc(sub)}</div></td>` +
        `</tr>`
      )
    })
    .join('')

  const supportRows = data.support
    .map(
      (row) =>
        `<tr>` +
        `<td style="padding:6px 0;font-size:13px;border-bottom:1px solid ${GRAY}">${esc(row.label)}</td>` +
        `<td style="padding:6px 0;font-size:13px;font-weight:700;text-align:right;border-bottom:1px solid ${GRAY}">${de(row.count)}</td>` +
        `</tr>`,
    )
    .join('')

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:${MUTEDBG};font-family:Inter,Arial,Helvetica,sans-serif;color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${MUTEDBG}">
<tr><td align="center" style="padding:20px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border:1px solid ${HAIR}">

  <tr><td style="background:${INK};border-top:3px solid ${ORANGE};padding:18px 22px">
    <div style="font-size:10px;letter-spacing:1.5px;color:${ORANGE};font-weight:700">STADTWERKE LÜBECK · LÜMOBIL</div>
    <div style="font-size:20px;font-weight:800;color:#ffffff;margin-top:4px">Migrations-Cockpit · ${esc(data.periodLabel)}-Report</div>
    <div style="font-size:11px;color:${GRAY};margin-top:6px">Zeitraum ${esc(data.rangeLabel)} · Realm ${esc(data.realm)}${data.mock ? ' · Mock-Daten' : ''}</div>
  </td></tr>

  <tr><td style="padding:18px 22px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:6px">
      <tr>
        ${kpiCell(de(k.logins), 'Erfolgreiche Logins (Zeitraum)')}
        ${kpiCell(de(k.errors), 'Fehlgeschlagen · ' + rate + ' %', k.errors > 0 ? PINK : INK)}
        ${kpiCell(de(k.newUsers), 'Neue Nutzer (Zeitraum)', ORANGE)}
      </tr>
      <tr>
        ${kpiCell(de(k.totalUsers), 'Nutzer gesamt (Realm)')}
        ${kpiCell(de(k.totalMigrated), 'Migriert gesamt (föderiert)')}
        ${kpiCell(k.progressPct + ' %', 'Migrationsfortschritt', ORANGE)}
      </tr>
    </table>

    <div style="font-size:14px;font-weight:800;margin:20px 0 4px">Verfügbarkeit <span style="color:${MUTED};font-weight:400;font-size:12px">· letzte 24 Stunden</span></div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${availRows}</table>

    <div style="font-size:14px;font-weight:800;margin:22px 0 4px">Konto &amp; Passwort <span style="color:${MUTED};font-weight:400;font-size:12px">· ${esc(data.supportWindowLabel)}</span></div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${supportRows}</table>

    <div style="margin-top:22px;border:1px solid ${HAIR};border-left:3px solid ${ORANGE};padding:12px 14px;background:${MUTEDBG}">
      <div style="font-size:13px;font-weight:700">Vollständige Diagramme im PDF-Anhang</div>
      <div style="font-size:12px;color:${MUTED};margin-top:3px">Logins/Fehler-Verlauf, neue Nutzer und alle Kennzahlen grafisch aufbereitet finden Sie im angehängten PDF (${esc(data.periodLabel)}-Report).</div>
    </div>
  </td></tr>

  <tr><td style="padding:14px 22px;border-top:1px solid ${HAIR};font-size:10px;color:${MUTED}">
    Automatischer ${esc(data.periodLabel)}-Report des LüMobil Migrations-Cockpits · erstellt ${esc(data.generatedAt)} Uhr · nur für den internen Gebrauch.
  </td></tr>

</table>
</td></tr></table>
</body></html>`
}
