/**
 * Verfügbarkeits-Historie als „Statuspage"-Streifen: je Dienst ein Band aus
 * 60 Segmenten (alt → neu) plus Uptime-Prozent. Rein darstellend (keine Hooks),
 * daher Server-Komponente. Farben = SWL-Statusfarben (grün/pink), grau = ohne
 * Daten/Konfiguration — das ist echter Status, keine Dekoration.
 */
import type { Availability } from '@/lib/cockpit/types'

function pct(v: number): string {
  return v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function AvailabilityStrip({ data }: { data: Availability }) {
  return (
    <div className="cx-card">
      <div className="cx-card-head">
        <div>
          <h3 className="cx-card-h">Verfügbarkeit</h3>
          <div className="cx-card-hint">
            {data.windowLabel}
            {data.lastCheck ? ` · letzter Check ${data.lastCheck} Uhr` : ''}
          </div>
        </div>
      </div>

      <div className="cx-avail">
        {data.services.map((s) => {
          const cls = !s.configured ? 'none' : s.uptimePct >= 99.5 ? 'ok' : s.uptimePct >= 95 ? 'warn' : 'bad'
          return (
            <div className="cx-avail-row" key={s.key}>
              <div className="cx-avail-meta">
                <span className="cx-avail-label">{s.label}</span>
                <span className={`cx-avail-pct cx-avail-pct--${cls}`}>
                  {s.configured ? `${pct(s.uptimePct)} %` : 'nicht konfiguriert'}
                </span>
              </div>
              <div
                className="cx-avail-strip"
                role="img"
                aria-label={
                  s.configured
                    ? `Verfügbarkeit ${s.label}: ${pct(s.uptimePct)} Prozent in den ${data.windowLabel}`
                    : `${s.label}: nicht konfiguriert`
                }
              >
                {s.segments.map((seg, i) => (
                  <i
                    key={i}
                    className={`cx-seg cx-seg--${seg === null ? 'none' : seg ? 'ok' : 'down'}`}
                    title={seg === null ? 'keine Daten' : seg ? 'verfügbar' : 'Störung'}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="cx-avail-legend">
        <span><i className="cx-seg cx-seg--ok" /> verfügbar</span>
        <span><i className="cx-seg cx-seg--down" /> Störung</span>
        <span><i className="cx-seg cx-seg--none" /> keine Daten</span>
        {data.mock && <span className="cx-avail-mock">Mock-Daten (Entwicklung)</span>}
      </div>
    </div>
  )
}
