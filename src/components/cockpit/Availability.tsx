/**
 * Verfügbarkeits-Historie als „Statuspage"-Streifen: je Dienst ein Band aus
 * Zeit-Segmenten (festes Raster) + Kennzahlen, die erklären, was eine Störung
 * bedeutet: Uptime, „N von M Checks ok", Zahl der Störfenster und wann zuletzt.
 * Rein darstellend (keine Hooks) → Server-Komponente. Farben = SWL-Statusfarben.
 */
import type { Availability, AvailabilitySvc } from '@/lib/cockpit/types'

function pct(v: number): string {
  return v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

const STATE_TEXT = { ok: 'verfügbar', down: 'Störung', none: 'keine Daten' } as const

function StateBadge({ svc }: { svc: AvailabilitySvc }) {
  const label = !svc.configured ? 'nicht konfiguriert' : STATE_TEXT[svc.current]
  const cls = !svc.configured ? 'none' : svc.current
  return <span className={`cx-avail-state cx-avail-state--${cls}`}>{label}</span>
}

export function AvailabilityStrip({ data }: { data: Availability }) {
  const bucket = data.bucketMinutes % 60 === 0 ? `${data.bucketMinutes / 60} h` : `${data.bucketMinutes} Min.`

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

      <p className="cx-avail-explain">
        Jedes Segment steht für ein Zeitfenster von {bucket}. <b>Grün</b>: der Dienst hat auf den
        synthetischen Check geantwortet. <b>Pink</b>: mindestens ein Check im Fenster ist
        fehlgeschlagen – Nutzer hätten den Dienst zu dieser Zeit gestört erlebt. <b>Grau</b>: in
        diesem Fenster wurde nicht gemessen.
      </p>

      <div className="cx-avail">
        {data.services.map((s) => (
          <div className="cx-avail-row" key={s.key}>
            <div className="cx-avail-meta">
              <span className="cx-avail-label">{s.label}</span>
              <StateBadge svc={s} />
            </div>

            <div
              className="cx-avail-strip"
              role="img"
              aria-label={
                s.configured
                  ? `Verfügbarkeit ${s.label}: ${pct(s.uptimePct)} Prozent, ${s.outages} Störfenster`
                  : `${s.label}: nicht konfiguriert`
              }
            >
              {s.segments.map((seg, i) => (
                <i
                  key={i}
                  className={`cx-seg cx-seg--${seg.state}`}
                  title={`${seg.label}: ${STATE_TEXT[seg.state]}`}
                />
              ))}
            </div>

            {s.configured ? (
              <div className="cx-avail-facts">
                <span>
                  Uptime <b>{pct(s.uptimePct)} %</b>
                </span>
                <span>
                  {s.samples - s.downSamples} von {s.samples} Checks ok
                </span>
                <span>
                  {s.outages === 0 ? 'keine Störungen' : `${s.outages} Störfenster`}
                </span>
                {s.lastOutage && <span>zuletzt gestört: {s.lastOutage} Uhr</span>}
              </div>
            ) : (
              <div className="cx-avail-facts">
                <span>Kein synthetischer Check aktiv – siehe <code>SYNTH_LOGIN_*</code>.</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {data.mock && <div className="cx-avail-legend cx-avail-mock">Mock-Daten (Entwicklung)</div>}
    </div>
  )
}
