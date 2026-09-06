/**
 * Sehr einfaches In-Memory-Rate-Limit (gleitendes Fenster) pro Schlüssel.
 * Für den Kundencheck: begrenzt Enumeration-Versuche pro Session.
 *
 * Hinweis: prozess-lokal. Bei mehreren App-Instanzen gilt das Limit je
 * Instanz — für ein internes Support-Werkzeug ausreichend.
 */
const hits = new Map<string, number[]>()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const cutoff = now - windowMs
  const arr = (hits.get(key) ?? []).filter((t) => t > cutoff)
  if (arr.length >= limit) {
    hits.set(key, arr)
    return false
  }
  arr.push(now)
  hits.set(key, arr)
  return true
}
