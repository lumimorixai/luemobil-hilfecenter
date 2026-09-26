'use client'

/**
 * Handgefertigte SVG-Charts im SWL-Design (Klarheit vor Dekoration):
 * feine Hairline-Raster, Inter-Beschriftung, Orange-Akzent, 2px-Kanten,
 * keine Verläufe/Schatten. Interaktiv mit Hover-Crosshair + Tooltip.
 *
 * Farbwahl unter SWL-Zwang: Ampelfarben sind als Diagrammserien verboten,
 * daher Logins = Orange (--swl-orange), Fehler = Schwarz (gestrichelt);
 * Identität zusätzlich über Legende + gestrichelte Linie, nicht nur Farbe.
 */
import { useEffect, useState, type ReactNode } from 'react'
import type { CountPoint, DailyPoint, IntradayPoint, NewUsers } from '@/lib/cockpit/types'
import { shortDe } from '@/lib/cockpit/date'
import { axisTicks, de, niceMax, smoothPath } from '@/lib/cockpit/chartMath'

/*
 * Farben kommen aus den Theme-Variablen der Hülle (.cx-app), damit dieselben
 * Diagramme in der hellen und der dunklen Fassung stimmen. Feste Hex-Werte
 * würden in einer der beiden falsch aussehen.
 */
const ORANGE = 'var(--akzent, #ff8200)'
const INK = 'var(--t1, #000000)'
const HAIR = 'var(--kante, #cfcfcf)'
const GRID = 'var(--linie, #e7e7e7)'
const MUTED = 'var(--t5, #7a7474)'
const PINK = 'var(--pink, #f73e5e)'
const FLAECHE = 'var(--glas, #ffffff)'

/** Hover-Punkt mit weißem Ring (hebt den Messpunkt sauber vom Verlauf ab). */
function Dot({ cx, cy, fill }: { cx: number; cy: number; fill: string }) {
  return <circle cx={cx} cy={cy} r={4} fill={fill} stroke={FLAECHE} strokeWidth={2} />
}

// ============================================================
// Logins vs. Fehler pro Tag (2 Serien)
// ============================================================

export function LoginsChart({ series }: { series: DailyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)

  const W = 640
  const H = 260
  const padL = 44
  const padR = 16
  const padT = 16
  const padB = 34
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const n = series.length
  const maxY = niceMax(Math.max(1, ...series.map((d) => d.logins)))
  const x = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const y = (v: number) => padT + plotH - (v / maxY) * plotH

  const line = (key: 'logins' | 'loginErrors') =>
    smoothPath(series.map((d, i) => ({ x: x(i), y: y(d[key]) })))

  const areaLogins =
    smoothPath(series.map((d, i) => ({ x: x(i), y: y(d.logins) }))) +
    ` L${x(n - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`

  const gridVals = [0, maxY / 2, maxY]
  const tickIdx = axisTicks(n, 4)

  const hi = hover != null ? series[hover] : null

  return (
    <div className="cx-chart">
      <div className="cx-legend">
        <span><i className="cx-swatch" style={{ background: ORANGE }} /> Logins</span>
        <span><i className="cx-swatch" style={{ background: INK }} /> Fehler (gestrichelt)</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Logins und Fehler pro Tag, letzte 14 Tage">
        {/* Rasterlinien + Y-Beschriftung */}
        {gridVals.map((v, i) => (
          <g key={i}>
            <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke={i === 0 ? HAIR : GRID} />
            <text x={padL - 8} y={y(v) + 3} textAnchor="end" className="cx-axis">{de(Math.round(v))}</text>
          </g>
        ))}
        {/* Fläche unter Logins (dezent, neutral) */}
        <path d={areaLogins} fill={ORANGE} opacity={0.1} />
        {/* Fehler (gestrichelt, neutral) */}
        <path d={line('loginErrors')} fill="none" stroke={INK} strokeWidth={1.75} strokeDasharray="4 3" strokeLinejoin="round" />
        {/* Logins (Orange) */}
        <path d={line('logins')} fill="none" stroke={ORANGE} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {/* Direktlabel am letzten Login-Punkt (Relief für Kontrast-WARN) */}
        {n > 0 && (
          <text x={x(n - 1)} y={y(series[n - 1].logins) - 8} textAnchor="end" className="cx-endlabel">
            {de(series[n - 1].logins)}
          </text>
        )}
        {/* X-Achsen-Beschriftung */}
        {tickIdx.map((i) => (
          <text key={i} x={x(i)} y={H - 12} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="cx-axis">
            {shortDe(series[i].datum)}
          </text>
        ))}
        {/* Hover-Crosshair + Punkte */}
        {hi && (
          <g>
            <line x1={x(hover!)} y1={padT} x2={x(hover!)} y2={padT + plotH} stroke={HAIR} />
            <Dot cx={x(hover!)} cy={y(hi.loginErrors)} fill={INK} />
            <Dot cx={x(hover!)} cy={y(hi.logins)} fill={ORANGE} />
          </g>
        )}
        {/* Unsichtbare Hover-Bänder (skalierungsunabhängig) */}
        {series.map((_, i) => (
          <rect
            key={i}
            x={x(i) - (plotW / n) / 2}
            y={padT}
            width={plotW / n}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover((h) => (h === i ? null : h))}
          />
        ))}
        {/* Tooltip */}
        {hi && <Tooltip xPos={x(hover!)} W={W} title={shortDe(hi.datum)} rows={[
          { label: 'Logins', value: de(hi.logins), color: ORANGE },
          { label: 'Fehler', value: de(hi.loginErrors), color: INK },
        ]} />}
      </svg>
    </div>
  )
}

// ============================================================
// Migrierte Kunden, kumuliert (1 Serie)
// ============================================================

export function CumulativeChart({ points }: { points: { datum: string; total: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)

  const W = 440
  const H = 260
  const padL = 52
  const padR = 16
  const padT = 16
  const padB = 34
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const n = points.length
  const minV = Math.min(...points.map((p) => p.total))
  const maxV = niceMax(Math.max(1, ...points.map((p) => p.total)))
  const base = Math.max(0, Math.floor(minV / 100) * 100)
  const x = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const y = (v: number) => padT + plotH - ((v - base) / (maxV - base || 1)) * plotH

  const linePath = smoothPath(points.map((p, i) => ({ x: x(i), y: y(p.total) })))
  const areaPath = linePath + ` L${x(n - 1).toFixed(1)},${y(base).toFixed(1)} L${x(0).toFixed(1)},${y(base).toFixed(1)} Z`

  const gridVals = [base, (base + maxV) / 2, maxV]
  const tickIdx = [0, n - 1].filter((v, i, a) => a.indexOf(v) === i)
  const hi = hover != null ? points[hover] : null

  return (
    <div className="cx-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Kumulierte migrierte Kunden, letzte 14 Tage">
        {gridVals.map((v, i) => (
          <g key={i}>
            <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke={i === 0 ? HAIR : GRID} />
            <text x={padL - 8} y={y(v) + 3} textAnchor="end" className="cx-axis">{de(Math.round(v))}</text>
          </g>
        ))}
        <path d={areaPath} fill={ORANGE} opacity={0.08} />
        <path d={linePath} fill="none" stroke={ORANGE} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {n > 0 && (
          <>
            <Dot cx={x(n - 1)} cy={y(points[n - 1].total)} fill={ORANGE} />
            <text x={x(n - 1)} y={y(points[n - 1].total) - 9} textAnchor="end" className="cx-endlabel">
              {de(points[n - 1].total)}
            </text>
          </>
        )}
        {tickIdx.map((i) => (
          <text key={i} x={x(i)} y={H - 12} textAnchor={i === 0 ? 'start' : 'end'} className="cx-axis">
            {shortDe(points[i].datum)}
          </text>
        ))}
        {hi && (
          <g>
            <line x1={x(hover!)} y1={padT} x2={x(hover!)} y2={padT + plotH} stroke={HAIR} />
            <Dot cx={x(hover!)} cy={y(hi.total)} fill={ORANGE} />
          </g>
        )}
        {points.map((_, i) => (
          <rect
            key={i}
            x={x(i) - (plotW / n) / 2}
            y={padT}
            width={plotW / n}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover((h) => (h === i ? null : h))}
          />
        ))}
        {hi && <Tooltip xPos={x(hover!)} W={W} title={shortDe(hi.datum)} rows={[
          { label: 'Migriert', value: de(hi.total), color: ORANGE },
        ]} />}
      </svg>
    </div>
  )
}

// ============================================================
// Generisches 2-Serien-Liniendiagramm (Label-Achse) — Intraday & Migration
// ============================================================

export type DualPoint = { label: string; a: number; b: number }

export function DualLineChart({
  points,
  labelA = 'Logins',
  labelB = 'Fehler',
  dashB = true,
  maxTicks = 6,
}: {
  points: DualPoint[]
  labelA?: string
  labelB?: string
  dashB?: boolean
  maxTicks?: number
}) {
  const [hover, setHover] = useState<number | null>(null)

  const W = 640
  const H = 240
  const padL = 40
  const padR = 16
  const padT = 16
  const padB = 32
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const n = points.length
  const maxY = niceMax(Math.max(1, ...points.map((d) => Math.max(d.a, d.b))))
  const x = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const y = (v: number) => padT + plotH - (v / maxY) * plotH

  const path = (key: 'a' | 'b') =>
    smoothPath(points.map((d, i) => ({ x: x(i), y: y(d[key]) })))

  const area =
    smoothPath(points.map((d, i) => ({ x: x(i), y: y(d.a) }))) +
    ` L${x(n - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`

  const gridVals = [0, maxY / 2, maxY]
  const tickIdx = axisTicks(n, maxTicks)
  const hi = hover != null ? points[hover] : null

  return (
    <div className="cx-chart">
      <div className="cx-legend">
        <span><i className="cx-swatch" style={{ background: ORANGE }} /> {labelA}</span>
        <span>
          <i className="cx-swatch" style={{ background: INK }} /> {labelB}
          {dashB ? ' (gestrichelt)' : ''}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${labelA} und ${labelB} über die Zeit`}>
        {gridVals.map((v, i) => (
          <g key={i}>
            <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke={i === 0 ? HAIR : GRID} />
            <text x={padL - 8} y={y(v) + 3} textAnchor="end" className="cx-axis">{de(Math.round(v))}</text>
          </g>
        ))}
        <path d={area} fill={ORANGE} opacity={0.1} />
        <path
          d={path('b')}
          fill="none"
          stroke={INK}
          strokeWidth={1.75}
          strokeDasharray={dashB ? '4 3' : undefined}
          strokeLinejoin="round"
        />
        <path d={path('a')} fill="none" stroke={ORANGE} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {tickIdx.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 12}
            textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
            className="cx-axis"
          >
            {points[i].label}
          </text>
        ))}
        {hi && (
          <g>
            <line x1={x(hover!)} y1={padT} x2={x(hover!)} y2={padT + plotH} stroke={HAIR} />
            <Dot cx={x(hover!)} cy={y(hi.b)} fill={INK} />
            <Dot cx={x(hover!)} cy={y(hi.a)} fill={ORANGE} />
          </g>
        )}
        {points.map((_, i) => (
          <rect
            key={i}
            x={x(i) - (plotW / n) / 2}
            y={padT}
            width={plotW / n}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover((h) => (h === i ? null : h))}
          />
        ))}
        {hi && <Tooltip xPos={x(hover!)} W={W} title={hi.label} rows={[
          { label: labelA, value: de(hi.a), color: ORANGE },
          { label: labelB, value: de(hi.b), color: INK },
        ]} />}
      </svg>
    </div>
  )
}

// ============================================================
// Balken-Diagramm (Zähler je Bucket) — für „Neue Konten"
// ============================================================

function BarChart({ points, maxTicks = 6 }: { points: CountPoint[]; maxTicks?: number }) {
  const [hover, setHover] = useState<number | null>(null)

  const W = 640
  const H = 240
  const padL = 40
  const padR = 16
  const padT = 16
  const padB = 32
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const n = points.length
  const maxY = niceMax(Math.max(1, ...points.map((d) => d.count)))
  const slot = plotW / n
  const barW = Math.max(3, slot * 0.6)
  const cx = (i: number) => padL + slot * i + slot / 2
  const y = (v: number) => padT + plotH - (v / maxY) * plotH

  const gridVals = [0, maxY / 2, maxY]
  const tickIdx = axisTicks(n, maxTicks)
  const hi = hover != null ? points[hover] : null

  return (
    <div className="cx-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Neue Konten je Zeitraum">
        {gridVals.map((v, i) => (
          <g key={i}>
            <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke={i === 0 ? HAIR : GRID} />
            <text x={padL - 8} y={y(v) + 3} textAnchor="end" className="cx-axis">{de(Math.round(v))}</text>
          </g>
        ))}
        {points.map((d, i) => (
          <rect
            key={i}
            x={cx(i) - barW / 2}
            y={y(d.count)}
            width={barW}
            height={Math.max(0, padT + plotH - y(d.count))}
            rx={3}
            fill={ORANGE}
            opacity={hover == null || hover === i ? 1 : 0.45}
          />
        ))}
        {tickIdx.map((i) => (
          <text
            key={i}
            x={cx(i)}
            y={H - 12}
            textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
            className="cx-axis"
          >
            {points[i].label}
          </text>
        ))}
        {points.map((_, i) => (
          <rect
            key={i}
            x={padL + slot * i}
            y={padT}
            width={slot}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover((h) => (h === i ? null : h))}
          />
        ))}
        {hi && (
          <Tooltip
            xPos={cx(hover!)}
            W={W}
            title={hi.label}
            rows={[{ label: 'Neue Konten', value: de(hi.count), color: ORANGE }]}
          />
        )}
      </svg>
    </div>
  )
}

const NEWUSER_RANGES = [
  { key: 'week', label: '7 Tage' },
  { key: 'month', label: '30 Tage' },
  { key: 'quarter', label: '90 Tage' },
  { key: 'year', label: '1 Jahr' },
] as const

export function NewUsersChart({ data }: { data: NewUsers }) {
  const [range, setRange] = useState<'week' | 'month' | 'quarter' | 'year'>('week')
  return (
    <div>
      <div className="cx-range">
        {NEWUSER_RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            className={`cx-range-btn${range === r.key ? ' active' : ''}`}
            onClick={() => setRange(r.key)}
          >
            {r.label}
            <span className="cx-range-total">{de(data.totals[r.key])}</span>
          </button>
        ))}
      </div>
      <BarChart points={data[range]} maxTicks={7} />
      <div className="cx-card-hint" style={{ marginTop: 8 }}>
        Heute {de(data.totals.today)} · Bestand {de(data.totalUsers)} Konten · Quelle:
        Anlagedatum in Keycloak, in der eigenen Datenbank fortgeschrieben
      </div>
    </div>
  )
}

// ============================================================
// Logins & Fehler mit Umschalter: pro Tag (14 T) ↔ pro Stunde (24 h)
// ============================================================

export function LoginsRangeChart({
  daily,
  hourly,
}: {
  daily: DailyPoint[]
  hourly: IntradayPoint[] | null
}) {
  const [range, setRange] = useState<'day' | 'hour'>('day')
  // Wie viele Tage die Tagesansicht zeigt. Die Reihe reicht ein Jahr zurück;
  // voreingestellt bleiben 14 Tage, damit der Blick aufs Aktuelle fällt.
  const [tage, setTage] = useState(14)
  const hasHourly = !!hourly && hourly.length > 0
  const showHour = range === 'hour' && hasHourly
  const sichtbar = daily.slice(-tage)
  return (
    <div>
      <div className="cx-range">
        <button
          type="button"
          className={`cx-range-btn${!showHour ? ' active' : ''}`}
          onClick={() => setRange('day')}
        >
          Pro Tag<span className="cx-range-total">{tage} Tage</span>
        </button>
        {hasHourly && (
          <button
            type="button"
            className={`cx-range-btn${showHour ? ' active' : ''}`}
            onClick={() => setRange('hour')}
          >
            Pro Stunde<span className="cx-range-total">24 h</span>
          </button>
        )}
      </div>
      {!showHour && (
        <div className="cx-range cx-range--sub">
          {[14, 30, 90, 365].map((n) => (
            <button
              key={n}
              type="button"
              className={`cx-range-btn${tage === n ? ' active' : ''}`}
              onClick={() => setTage(n)}
              disabled={daily.length < 2}
            >
              {n === 365 ? '1 Jahr' : `${n} Tage`}
            </button>
          ))}
        </div>
      )}
      {showHour ? (
        <DualLineChart
          points={hourly!.map((p) => ({ label: p.label, a: p.logins, b: p.loginErrors }))}
          maxTicks={7}
        />
      ) : (
        <LoginsChart series={sichtbar} />
      )}
    </div>
  )
}

// ============================================================
// ChartCard: Karte mit Titel + „Vergrößern" (Modal)
// ============================================================

export function ChartCard({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="cx-card">
      <div className="cx-card-head">
        <div>
          <h3 className="cx-card-h">{title}</h3>
          {hint && <div className="cx-card-hint">{hint}</div>}
        </div>
        <button className="cx-expand" type="button" onClick={() => setOpen(true)} aria-label="Vergrößern" title="Vergrößern">
          ⤢
        </button>
      </div>
      {children}

      {open && (
        <div className="cx-modal" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="cx-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="cx-modal-head">
              <h3 className="cx-card-h">{title}</h3>
              <button className="cx-modal-close" type="button" onClick={() => setOpen(false)} aria-label="Schließen">
                ×
              </button>
            </div>
            {hint && <div className="cx-card-hint">{hint}</div>}
            <div className="cx-modal-chart">{children}</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Sparkline (Mini-Trend in KPI-Kacheln)
// ============================================================

export function Sparkline({
  values,
  ton = 'akzent',
}: {
  values: number[]
  /** „akzent" für gewöhnliche Reihen, „no" für Fehlerzahlen. */
  ton?: 'akzent' | 'no' | 'leise'
}) {
  const color = ton === 'no' ? PINK : ton === 'leise' ? MUTED : ORANGE
  const W = 120
  const H = 26
  const n = values.length
  if (n === 0) return null
  const max = Math.max(1, ...values)
  const min = Math.min(...values)
  const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W)
  const y = (v: number) => H - 2 - ((v - min) / (max - min || 1)) * (H - 5)
  const line = smoothPath(values.map((v, i) => ({ x: x(i), y: y(v) })))
  const area = `${line} L${x(n - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="cx-spark" preserveAspectRatio="none" aria-hidden="true">
      <path d={area} fill={color} opacity={0.1} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ============================================================
// Gemeinsamer SVG-Tooltip
// ============================================================

function Tooltip({
  xPos,
  W,
  title,
  rows,
}: {
  xPos: number
  W: number
  title: string
  rows: { label: string; value: string; color: string }[]
}) {
  const boxW = 132
  const boxH = 20 + rows.length * 18
  const flip = xPos + boxW + 12 > W
  const bx = flip ? xPos - boxW - 10 : xPos + 10
  const by = 18
  return (
    <g pointerEvents="none">
      <rect x={bx} y={by} width={boxW} height={boxH} rx={10} fill={FLAECHE} stroke={HAIR} />
      <text x={bx + 10} y={by + 15} className="cx-tt-title">{title}</text>
      {rows.map((r, i) => (
        <g key={i}>
          <rect x={bx + 10} y={by + 24 + i * 18 - 7} width={8} height={8} fill={r.color} rx={1} />
          <text x={bx + 24} y={by + 24 + i * 18} className="cx-tt-label">{r.label}</text>
          <text x={bx + boxW - 10} y={by + 24 + i * 18} textAnchor="end" className="cx-tt-value">{r.value}</text>
        </g>
      ))}
    </g>
  )
}
