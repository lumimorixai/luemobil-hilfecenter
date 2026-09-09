/**
 * Grafischer Cockpit-Report als PDF (@react-pdf/renderer, ohne Headless-Browser).
 * Design im Hilfecenter-/SWL-Stil: Schwarz-Header mit Orange-Akzent, 2px-Kanten,
 * keine Verläufe/Schatten. Charts werden mit derselben Mathematik gezeichnet wie
 * die interaktiven SVG-Charts (chartMath.ts).
 */
import React from 'react'
import { Document, Page, Text, View, StyleSheet, Svg, Path, Line, Rect } from '@react-pdf/renderer'
import { axisTicks, de, niceMax, smoothPath } from '../../../lib/cockpit/chartMath'
import type { Bar, ReportData, SeriesPoint } from '../../../lib/cockpit/report'

const ORANGE = '#ff8200'
const INK = '#000000'
const HAIR = '#cfcfcf'
const GRID = '#e7e7e7'
const MUTED = '#7a7474'
const WHITE = '#ffffff'
const GREEN = '#00aa32'
const PINK = '#f73e5e'

const s = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 36, paddingHorizontal: 32, fontSize: 9, color: INK, fontFamily: 'Helvetica' },
  header: { backgroundColor: INK, color: WHITE, padding: 14, borderTopWidth: 3, borderTopColor: ORANGE },
  brand: { fontSize: 8, color: ORANGE, letterSpacing: 1, fontFamily: 'Helvetica-Bold' },
  title: { fontSize: 16, color: WHITE, marginTop: 3, fontFamily: 'Helvetica-Bold' },
  sub: { fontSize: 8, color: '#e4e4e4', marginTop: 4 },
  h2: { fontSize: 11, marginTop: 16, marginBottom: 6, fontFamily: 'Helvetica-Bold' },
  hint: { fontSize: 8, color: MUTED, marginBottom: 6 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  kpi: { width: '48%', borderWidth: 1, borderColor: HAIR, padding: 8 },
  kpiN: { fontSize: 16, fontFamily: 'Helvetica-Bold' },
  kpiL: { fontSize: 7.5, color: MUTED, marginTop: 2 },
  legend: { flexDirection: 'row', gap: 14, marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 9, height: 9, borderRadius: 1 },
  legendText: { fontSize: 8, color: MUTED },
  table: { borderWidth: 1, borderColor: HAIR, marginTop: 4 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: GRID },
  trLast: { flexDirection: 'row' },
  th: { flex: 1, padding: 5, fontSize: 8, color: MUTED, fontFamily: 'Helvetica-Bold', backgroundColor: '#f8f8f8' },
  td: { flex: 1, padding: 5, fontSize: 8.5 },
  tdNum: { flex: 1, padding: 5, fontSize: 8.5, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  footer: { position: 'absolute', bottom: 16, left: 32, right: 32, fontSize: 7, color: MUTED, borderTopWidth: 1, borderTopColor: HAIR, paddingTop: 6 },
  twocol: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
})

// ---- Charts als react-pdf-SVG -------------------------------------------------

function LineChartSvg({ series, width, height }: { series: SeriesPoint[]; width: number; height: number }) {
  const padL = 30
  const padR = 10
  const padT = 10
  const padB = 20
  const plotW = width - padL - padR
  const plotH = height - padT - padB
  const n = series.length
  if (n === 0) return <View style={{ height, borderWidth: 1, borderColor: HAIR }} />
  const maxY = niceMax(Math.max(1, ...series.map((d) => Math.max(d.a, d.b))))
  const x = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const y = (v: number) => padT + plotH - (v / maxY) * plotH
  const aPath = smoothPath(series.map((d, i) => ({ x: x(i), y: y(d.a) })))
  const bPath = smoothPath(series.map((d, i) => ({ x: x(i), y: y(d.b) })))
  const area = `${aPath} L${x(n - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`
  const grid = [0, maxY / 2, maxY]
  const ticks = axisTicks(n, 6)
  return (
    <Svg width={width} height={height}>
      {grid.map((v, i) => (
        <React.Fragment key={i}>
          <Line x1={padL} y1={y(v)} x2={width - padR} y2={y(v)} stroke={i === 0 ? HAIR : GRID} strokeWidth={0.75} />
          <Text x={padL - 4} y={y(v) + 3} textAnchor="end" fill={MUTED} style={{ fontSize: 6.5 }}>
            {de(Math.round(v))}
          </Text>
        </React.Fragment>
      ))}
      <Path d={area} fill={ORANGE} fillOpacity={0.1} />
      <Path d={bPath} stroke={INK} strokeWidth={1} fill="none" strokeDasharray="3 2" />
      <Path d={aPath} stroke={ORANGE} strokeWidth={1.75} fill="none" />
      {ticks.map((i) => (
        <Text
          key={i}
          x={x(i)}
          y={height - 7}
          textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
          fill={MUTED}
          style={{ fontSize: 6.5 }}
        >
          {series[i].label}
        </Text>
      ))}
    </Svg>
  )
}

function BarChartSvg({ bars, width, height }: { bars: Bar[]; width: number; height: number }) {
  const padL = 30
  const padR = 10
  const padT = 10
  const padB = 20
  const plotW = width - padL - padR
  const plotH = height - padT - padB
  const n = bars.length
  if (n === 0) return <View style={{ height, borderWidth: 1, borderColor: HAIR }} />
  const maxY = niceMax(Math.max(1, ...bars.map((d) => d.count)))
  const slot = plotW / n
  const barW = Math.max(1.5, slot * 0.62)
  const cx = (i: number) => padL + slot * i + slot / 2
  const y = (v: number) => padT + plotH - (v / maxY) * plotH
  const grid = [0, maxY / 2, maxY]
  const ticks = axisTicks(n, 6)
  return (
    <Svg width={width} height={height}>
      {grid.map((v, i) => (
        <React.Fragment key={i}>
          <Line x1={padL} y1={y(v)} x2={width - padR} y2={y(v)} stroke={i === 0 ? HAIR : GRID} strokeWidth={0.75} />
          <Text x={padL - 4} y={y(v) + 3} textAnchor="end" fill={MUTED} style={{ fontSize: 6.5 }}>
            {de(Math.round(v))}
          </Text>
        </React.Fragment>
      ))}
      {bars.map((d, i) => (
        <Rect key={i} x={cx(i) - barW / 2} y={y(d.count)} width={barW} height={Math.max(0, padT + plotH - y(d.count))} fill={ORANGE} rx={1.5} />
      ))}
      {ticks.map((i) => (
        <Text
          key={i}
          x={cx(i)}
          y={height - 7}
          textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
          fill={MUTED}
          style={{ fontSize: 6.5 }}
        >
          {bars[i].label}
        </Text>
      ))}
    </Svg>
  )
}

function Legend() {
  return (
    <View style={s.legend}>
      <View style={s.legendItem}>
        <View style={[s.swatch, { backgroundColor: ORANGE }]} />
        <Text style={s.legendText}>Logins</Text>
      </View>
      <View style={s.legendItem}>
        <View style={[s.swatch, { backgroundColor: INK }]} />
        <Text style={s.legendText}>Fehler (gestrichelt)</Text>
      </View>
    </View>
  )
}

// ---- Dokument -----------------------------------------------------------------

export function ReportPdf({ data }: { data: ReportData }) {
  const CW = 531 // A4 (595pt) minus 2×32 Rand
  const k = data.kpis
  const rate = k.errorRatePct.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return (
    <Document title={`LüMobil Cockpit-Report – ${data.periodLabel}`} author="LüMobil Migrations-Cockpit">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.brand}>STADTWERKE LÜBECK · LÜMOBIL</Text>
          <Text style={s.title}>Migrations-Cockpit · {data.periodLabel}-Report</Text>
          <Text style={s.sub}>
            Zeitraum {data.rangeLabel} · Realm {data.realm} · erstellt {data.generatedAt} Uhr
            {data.mock ? ' · Mock-Daten (Entwicklung)' : ''}
          </Text>
        </View>

        {/* KPIs */}
        <View style={s.kpis}>
          <View style={s.kpi}>
            <Text style={s.kpiN}>{de(k.logins)}</Text>
            <Text style={s.kpiL}>Erfolgreiche Logins (Zeitraum)</Text>
          </View>
          <View style={s.kpi}>
            <Text style={[s.kpiN, { color: k.errors > 0 ? PINK : INK }]}>{de(k.errors)}</Text>
            <Text style={s.kpiL}>Fehlgeschlagene Logins · {rate} %</Text>
          </View>
          <View style={s.kpi}>
            <Text style={[s.kpiN, { color: ORANGE }]}>{de(k.newUsers)}</Text>
            <Text style={s.kpiL}>Neue Nutzer (Zeitraum)</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiN}>{de(k.totalUsers)}</Text>
            <Text style={s.kpiL}>Nutzer gesamt (Realm)</Text>
          </View>
        </View>

        {/* Login-Zeitreihe */}
        <Text style={s.h2}>{data.loginSeriesTitle}</Text>
        <Legend />
        <LineChartSvg series={data.loginSeries} width={CW} height={170} />

        {/* Neue Nutzer */}
        <Text style={s.h2}>{data.newUsersTitle}</Text>
        <Text style={s.hint}>Neuzugänge gesamt im Zeitraum: {de(data.newUsersTotal)}</Text>
        <BarChartSvg bars={data.newUsers} width={CW} height={150} />

        {/* Verfügbarkeit + Support nebeneinander */}
        <View style={s.twocol}>
          <View style={s.col}>
            <Text style={s.h2}>Verfügbarkeit (24 h)</Text>
            <View style={s.table}>
              <View style={s.tr}>
                <Text style={s.th}>Dienst</Text>
                <Text style={[s.th, { textAlign: 'right' }]}>Uptime</Text>
                <Text style={[s.th, { textAlign: 'right' }]}>Störungen</Text>
              </View>
              {data.availability.map((a, i) => (
                <View key={a.label} style={i === data.availability.length - 1 ? s.trLast : s.tr}>
                  <Text style={s.td}>{a.label}</Text>
                  <Text style={[s.tdNum, { color: !a.configured ? MUTED : a.uptimePct >= 99.5 ? GREEN : a.uptimePct >= 95 ? ORANGE : PINK }]}>
                    {a.configured ? `${a.uptimePct.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %` : 'n/a'}
                  </Text>
                  <Text style={s.tdNum}>{a.configured ? de(a.outages) : '–'}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={s.col}>
            <Text style={s.h2}>Konto & Passwort</Text>
            <Text style={s.hint}>{data.supportWindowLabel}</Text>
            <View style={s.table}>
              {data.support.map((row, i) => (
                <View key={row.label} style={i === data.support.length - 1 ? s.trLast : s.tr}>
                  <Text style={s.td}>{row.label}</Text>
                  <Text style={s.tdNum}>{de(row.count)}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <Text style={s.footer} fixed>
          LüMobil Hilfecenter · Migrations-Cockpit — automatischer {data.periodLabel}-Report. Datenquellen:
          Keycloak Admin API (Events, Users) und interne Health-Checks. Nur für den internen Gebrauch.
        </Text>
      </Page>
    </Document>
  )
}
