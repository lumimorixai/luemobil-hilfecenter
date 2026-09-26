/** Verfügbarkeit — Zustand der Dienste, Streifen über 24 Stunden. */
import { seiteCockpit } from '@/lib/auth/guard'
import { getAvailability, getCronStatus } from '@/lib/cockpit/stats'
import type { Availability } from '@/lib/cockpit/types'
import { AvailabilityStrip } from '@/components/cockpit/Availability'
import { Kennzahl, Seitenkopf, Unavailable } from '@/components/cockpit/bausteine'

export const dynamic = 'force-dynamic'

export default async function VerfuegbarkeitSeite() {
  await seiteCockpit('/cockpit/verfuegbarkeit')

  let availability: Availability | null = null
  try {
    availability = await getAvailability()
  } catch {
    availability = null
  }
  let cron: { lastHealth: string | null; lastAggregate: string | null } | null = null
  try {
    cron = await getCronStatus()
  } catch {
    cron = null
  }

  const gemessen = availability?.services.filter((s) => s.configured) ?? []
  const gesamt =
    gemessen.length > 0
      ? gemessen.reduce((n, s) => n + s.uptimePct, 0) / gemessen.length
      : null
  const stoerungen = gemessen.reduce((n, s) => n + s.outages, 0)

  return (
    <>
      <Seitenkopf
        titel="Verfügbarkeit"
        unterzeile="Jede Minute geprüft · Minutenwerte 35 Tage, danach als Tageswert dauerhaft"
      />

      <div className="cx-kpis cx-kpis--4">
        <Kennzahl
          zahl={gesamt != null ? `${gesamt.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %` : '—'}
          label="Uptime 24 Stunden"
          unten="über alle eingerichteten Dienste"
          akzent
        />
        <Kennzahl
          zahl={String(stoerungen)}
          label="Störfenster heute"
          unten={stoerungen === 0 ? 'keine Unterbrechung' : 'siehe Streifen unten'}
        />
        <Kennzahl zahl={availability?.lastCheck ?? '—'} label="Letzter Check" />
        <Kennzahl
          zahl={availability?.langfrist ? String(availability.langfrist.tage) : '—'}
          label="Tage aufgezeichnet"
          unten="verdichtet aus den Minutenwerten"
        />
      </div>

      {availability ? <AvailabilityStrip data={availability} /> : <Unavailable />}

      <div className="cx-glas cx-cronbar">
        <span className="cx-cronbar-t">Letzte Job-Läufe</span>
        <span>
          Systemstatus: <b>{cron?.lastHealth ?? 'noch nie'}</b>
        </span>
        <span>
          Tageswerte: <b>{cron?.lastAggregate ?? 'noch nie'}</b>
        </span>
      </div>
    </>
  )
}
