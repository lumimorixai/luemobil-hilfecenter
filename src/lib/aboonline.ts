/**
 * Aboonline-Webservice: nur die lesende AccountCheck-Abfrage.
 *
 *   GET {ABO_WS_URL}/api/AccountCheck/Auth/<email>
 *   Header: Authorization: Bearer {ABO_WS_TOKEN}
 *
 * Antwort-Interpretation (bewusst streng):
 *   200 + JSON → Kunde existiert (Feld `username` = Kundennummer)
 *   404        → Kunde existiert nicht
 *   403 / sonst / Timeout → Fehlerzustand („Webservice nicht erreichbar"),
 *                NIEMALS als „Kunde existiert nicht" interpretieren.
 *
 * Der passwortprüfende POST des Webservices wird hier NIE aufgerufen.
 * Solange COCKPIT_MOCK=true gesetzt ist, kommen Mock-Antworten.
 */
import { aboWsUrl, isMock } from './cockpit/config'
import type { AboResult } from './cockpit/types'
import { mockAbo } from './cockpit/mockData'

const TIMEOUT_MS = 12_000

export async function accountCheck(email: string): Promise<AboResult> {
  if (isMock()) return mockAbo(email)

  const token = process.env.ABO_WS_TOKEN
  const base = aboWsUrl()
  if (!token || !base) {
    return { state: 'error', reason: 'Aboonline-Webservice nicht konfiguriert' }
  }

  let res: Response
  try {
    res = await fetch(`${base}/api/AccountCheck/Auth/${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    // Netzwerkfehler / Timeout → Störung, nicht „existiert nicht".
    return { state: 'error', reason: 'Webservice nicht erreichbar' }
  }

  if (res.status === 404) return { state: 'not_found' }
  if (res.status === 403 || res.status === 401) {
    return { state: 'error', reason: 'Webservice-Zugang ungültig' }
  }
  if (!res.ok) return { state: 'error', reason: `Webservice-Fehler (HTTP ${res.status})` }

  const data = (await res.json().catch(() => null)) as
    | { username?: string; createdAt?: string; created?: string; anlagedatum?: string }
    | null
  if (!data || !data.username) {
    // 200 ohne verwertbaren Inhalt → vorsichtshalber als Störung behandeln.
    return { state: 'error', reason: 'Unerwartete Webservice-Antwort' }
  }
  return {
    state: 'found',
    kundennummer: data.username,
    createdAt: data.createdAt || data.created || data.anlagedatum,
  }
}
