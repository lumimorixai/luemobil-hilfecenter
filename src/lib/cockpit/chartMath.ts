/**
 * Framework-freie Chart-Mathematik – geteilt von den interaktiven SVG-Charts
 * (src/components/cockpit/charts.tsx) und dem PDF-Report (@react-pdf/renderer).
 * Enthält nur reine Funktionen, damit sie server- wie clientseitig laufen.
 */

/** „Schöne" Achsen-Obergrenze (aufgerundet auf 1-2-5-Stufen). */
export function niceMax(v: number): number {
  if (v <= 0) return 10
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

/**
 * Gleichmäßig verteilte X-Achsen-Ticks inkl. erstem und letztem Punkt – ohne
 * Überlappung am Rand. Platziert exakt `maxTicks` Positionen von 0…n-1.
 */
export function axisTicks(n: number, maxTicks: number): number[] {
  if (n <= 1) return n === 1 ? [0] : []
  if (n <= maxTicks) return Array.from({ length: n }, (_, i) => i)
  const stride = (n - 1) / (maxTicks - 1)
  const idx = Array.from({ length: maxTicks }, (_, k) => Math.round(k * stride))
  const uniq = Array.from(new Set(idx)).sort((a, b) => a - b)
  if (uniq[uniq.length - 1] !== n - 1) uniq.push(n - 1)
  return uniq
}

/**
 * Weiche Linie durch die Punkte per monotoner Kubik (Fritsch–Carlson): schwingt
 * nie über die Datenpunkte hinaus (kein „negatives" Aussehen bei Nullwerten).
 */
export function smoothPath(pts: { x: number; y: number }[]): string {
  const n = pts.length
  if (n === 0) return ''
  if (n < 3) {
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  }
  const dx: number[] = []
  const slope: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const h = pts[i + 1].x - pts[i].x
    dx.push(h)
    slope.push(h === 0 ? 0 : (pts[i + 1].y - pts[i].y) / h)
  }
  const m: number[] = new Array(n)
  m[0] = slope[0]
  m[n - 1] = slope[n - 2]
  for (let i = 1; i < n - 1; i++) {
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2
  }
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / slope[i]
    const b = m[i + 1] / slope[i]
    const s = a * a + b * b
    if (s > 9) {
      const tau = 3 / Math.sqrt(s)
      m[i] = tau * a * slope[i]
      m[i + 1] = tau * b * slope[i]
    }
  }
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const c1x = pts[i].x + dx[i] / 3
    const c1y = pts[i].y + (m[i] * dx[i]) / 3
    const c2x = pts[i + 1].x - dx[i] / 3
    const c2y = pts[i + 1].y - (m[i + 1] * dx[i]) / 3
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${pts[i + 1].x.toFixed(1)},${pts[i + 1].y.toFixed(1)}`
  }
  return d
}

/** Zahl im deutschen Format (Tausenderpunkt). */
export function de(n: number): string {
  return n.toLocaleString('de-DE')
}
