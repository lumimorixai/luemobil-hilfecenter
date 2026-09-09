/**
 * Report-Versand: erzeugt Daten → HTML-Mail-Body + PDF-Anhang und verschickt
 * beides über den vorhandenen Payload-Mail-Adapter an ALERT_EMAIL (dieselbe
 * Adresse wie die Störungs-Benachrichtigung). Genutzt von der API-Route
 * (manueller Trigger) und vom Cron-Job (automatischer Versand).
 */
import React from 'react'
import type { Payload } from 'payload'
import { renderToBuffer } from '@react-pdf/renderer'
import { getReport, type ReportPeriod } from './report'
import { buildReportHtml } from './reportHtml'
import { ReportPdf } from '../../components/cockpit/report/ReportPdf'
import { alertEmail } from './config'

const SUBJECT_PERIOD: Record<ReportPeriod, string> = {
  hour: 'Stunden',
  day: 'Tages',
  week: 'Wochen',
  month: 'Monats',
}

export type SendReportResult = { sent: boolean; to: string | null; period: ReportPeriod; reason?: string }

export async function sendReport(payload: Payload, period: ReportPeriod): Promise<SendReportResult> {
  const to = alertEmail()
  const data = await getReport(period)
  const html = buildReportHtml(data)
  const pdf = await renderToBuffer(<ReportPdf data={data} />)

  const dateTag = new Date().toLocaleDateString('de-DE').replace(/\./g, '-').replace(/-$/, '')
  const filename = `luemobil-cockpit-${period}-${dateTag}.pdf`
  const subject = `LüMobil-Cockpit — ${SUBJECT_PERIOD[period]}-Report (${data.rangeLabel})`

  if (!to) {
    payload.logger.warn('Report nicht versendet: ALERT_EMAIL ist nicht gesetzt.')
    return { sent: false, to: null, period, reason: 'ALERT_EMAIL nicht gesetzt' }
  }

  await payload.sendEmail({
    to,
    subject,
    html,
    attachments: [{ filename, content: pdf, contentType: 'application/pdf' }],
  })
  payload.logger.info(`Report-Mail versendet (${period}) an ${to} — PDF ${filename}`)
  return { sent: true, to, period }
}
