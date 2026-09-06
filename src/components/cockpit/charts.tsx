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
import { useState } from 'react'
import type { DailyPoint } from '@/lib/cockpit/types'
import { shortDe } from '@/lib/cockpit/date'

const ORANGE = '#ff8200'
const INK = '#000000'
const HAIR = '#cfcfcf'
const GRID = '#e7e7e7'
const MUTED = '#7a7474'

function de(n: number): string {
  return n.toLocaleString('de-DE')
}

/** Erzeugt „schöne" Achsen-Obergrenze (aufgerundet auf 1-2-5-Stufen). */
function niceMax(v: number): number {
  if (v <= 0) return 10
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
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
    series.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ')

  const areaLogins =
    series.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.logins).toFixed(1)}`).join(' ') +
    ` L${x(n - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`

  const gridVals = [0, maxY / 2, maxY]
  const tickIdx = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i)

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
        <path d={areaLogins} fill={ORANGE} opacity={0.06} />
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
            <circle cx={x(hover!)} cy={y(hi.logins)} r={3.5} fill={ORANGE} />
            <circle cx={x(hover!)} cy={y(hi.loginErrors)} r={3.5} fill={INK} />
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

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(' ')
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
            <circle cx={x(n - 1)} cy={y(points[n - 1].total)} r={3.5} fill={ORANGE} />
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
            <circle cx={x(hover!)} cy={y(hi.total)} r={3.5} fill={ORANGE} />
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
    points.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ')

  const area =
    points.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.a).toFixed(1)}`).join(' ') +
    ` L${x(n - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`

  const gridVals = [0, maxY / 2, maxY]
  const step = Math.max(1, Math.floor((n - 1) / (maxTicks - 1)))
  const tickIdx = Array.from({ length: n }, (_, i) => i).filter((i) => i % step === 0 || i === n - 1)
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
        <path d={area} fill={ORANGE} opacity={0.06} />
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
            <circle cx={x(hover!)} cy={y(hi.a)} r={3.5} fill={ORANGE} />
            <circle cx={x(hover!)} cy={y(hi.b)} r={3.5} fill={INK} />
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
      <rect x={bx} y={by} width={boxW} height={boxH} rx={2} fill="#ffffff" stroke={HAIR} />
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
