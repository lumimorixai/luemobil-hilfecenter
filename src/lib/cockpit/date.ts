/** Kleine Datums-Helfer für das Cockpit (lokale Zeit, deutsche Formate). */

const DAY_MS = 24 * 60 * 60 * 1000

/** Datum als JJJJ-MM-TT (lokale Zeit). */
export function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Heute als JJJJ-MM-TT. */
export function todayIso(): string {
  return isoDate(new Date())
}

/** Die letzten `days` Tage als JJJJ-MM-TT, aufsteigend (ältester zuerst). */
export function lastDays(days: number): string[] {
  const out: string[] = []
  for (let i = days - 1; i >= 0; i--) out.push(isoDate(new Date(Date.now() - i * DAY_MS)))
  return out
}

/** JJJJ-MM-TT → „TT.MM." (für Achsen-Beschriftung). */
export function shortDe(dayIso: string): string {
  const [, m, d] = dayIso.split('-')
  return `${d}.${m}.`
}
