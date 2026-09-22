/**
 * LüMobil Ticket-API: Bestellungen (inkl. generierter Deutschland-Tickets) zu
 * einer E-Mail-Adresse. NUR serverseitig aufrufen — Token und Antwort dürfen
 * den Server nicht Richtung Browser verlassen (der Kundencheck bekommt nur die
 * aufbereiteten Daten).
 *
 * Sicherheit (Vorgabe der API-Betreiber):
 * - Token aus LUEMOBIL_API_TOKEN_FILE (bei jedem Aufruf neu gelesen → Token-
 *   Wechsel ohne Deployment/Neustart) oder ersatzweise LUEMOBIL_API_TOKEN.
 * - Zertifikat wird immer geprüft; im Dev-System gegen die CA aus LUEMOBIL_API_CA.
 * - Weder Token noch E-Mail-Adresse werden geloggt (nur HTTP-Status).
 *
 * Bewusst über node:https statt fetch: so lässt sich die eigene CA ohne
 * zusätzliche Abhängigkeit (undici) hinterlegen.
 */
import { readFileSync } from 'node:fs'
import https from 'node:https'
import { payloadClient } from '../content'
import { alertEmail, isMock } from './config'

export type TicketOrder = {
  /** Zeitstempel ohne Zone, deutsche Ortszeit (z. B. 2026-09-03T13:50:04.59). */
  gekauft_am: string
  /** Text, 13 Stellen, führende Nullen möglich. */
  bestellnummer: string
  produkt: string
  sku: string
  menge: number
  /** Dezimalwert als Text (nicht als Float gerundet), z. B. „63.00". */
  preis_brutto: string
  status: string
  /** true = Ticket wurde ausgeliefert. */
  erfolgreich: boolean
}

export type TicketApiError =
  | 'unconfigured'
  | 'invalid_email'
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'unavailable'

export type TicketApiResult = { ok: true; orders: TicketOrder[] } | { ok: false; error: TicketApiError }

const TIMEOUT_MS = 10_000

function apiUrl(): string {
  return (process.env.LUEMOBIL_API_URL || '').replace(/\/+$/, '')
}

/** Token frisch lesen (Datei bevorzugt), damit ein Austausch sofort wirkt. */
function readToken(): string {
  const file = process.env.LUEMOBIL_API_TOKEN_FILE
  if (file) {
    try {
      return readFileSync(file, 'utf8').trim()
    } catch {
      return ''
    }
  }
  return (process.env.LUEMOBIL_API_TOKEN || '').trim()
}

let caCache: { path: string; pem: Buffer } | null = null
function readCa(): Buffer | undefined {
  const path = process.env.LUEMOBIL_API_CA
  if (!path) return undefined // Produktion: öffentliches Zertifikat, System-CAs genügen
  if (caCache?.path !== path) caCache = { path, pem: readFileSync(path) }
  return caCache.pem
}

export function ticketApiConfigured(): boolean {
  return Boolean(apiUrl() && readToken())
}

type RawResponse = { status: number; body: string }

function post(url: string, token: string, body: string, bearbeiter: string): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        ca: readCa(),
        // rejectUnauthorized bleibt bewusst auf dem Standard (true).
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...(bearbeiter ? { 'X-Bearbeiter': encodeHeader(bearbeiter) } : {}),
        },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }))
        res.on('error', reject)
      },
    )
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', reject)
    req.end(body)
  })
}

/** HTTP-Header dürfen nur ASCII enthalten (Umlaute im Namen → ersetzen). */
function encodeHeader(v: string): string {
  return v
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .slice(0, 200)
}

/**
 * Antwort parsen; preis_brutto dabei als Originaltext übernehmen (JSON.parse
 * mit Quelltext-Zugriff, Node ≥ 21), damit Beträge nicht als Float gerundet werden.
 */
function parseOrders(body: string): TicketOrder[] {
  const reviver = (key: string, value: unknown, ctx?: { source?: string }) =>
    key === 'preis_brutto' && ctx?.source ? ctx.source : value
  const raw = JSON.parse(body, reviver as (k: string, v: unknown) => unknown) as Record<string, unknown>[]
  if (!Array.isArray(raw)) throw new Error('Antwort ist keine Liste')
  return raw.map((r) => ({
    gekauft_am: String(r.gekauft_am ?? ''),
    bestellnummer: String(r.bestellnummer ?? ''),
    produkt: String(r.produkt ?? ''),
    sku: String(r.sku ?? ''),
    menge: Number(r.menge ?? 0),
    preis_brutto: r.preis_brutto == null ? '' : String(r.preis_brutto),
    status: String(r.status ?? ''),
    erfolgreich: r.erfolgreich === true,
  }))
}

/** Bestellungen zu einer E-Mail (neueste zuerst). Wirft nie — Fehler als Ergebnis. */
export async function ticketsFuerEmail(email: string, bearbeiter: string): Promise<TicketApiResult> {
  if (isMock() && !ticketApiConfigured()) return { ok: true, orders: mockOrders(email) }

  const base = apiUrl()
  const token = readToken()
  if (!base || !token) return { ok: false, error: 'unconfigured' }

  const url = `${base}/rpc/tickets_fuer_email`
  const body = JSON.stringify({ p_email: email.trim().toLowerCase() })

  // Höchstens ein Wiederholungsversuch, und nur bei Störung (5xx/Netzfehler, nicht nach Timeout).
  for (let attempt = 1; attempt <= 2; attempt++) {
    let res: RawResponse
    try {
      res = await post(url, token, body, bearbeiter)
    } catch (err) {
      const msg = (err as Error).message
      console.warn(`[ticket-api] Anfrage fehlgeschlagen (${msg}), Versuch ${attempt}`)
      // Nach einem Timeout nicht wiederholen — sonst wartet das Servicecenter 20 s.
      if (attempt === 2 || msg === 'timeout') return { ok: false, error: 'unavailable' }
      continue
    }

    if (res.status === 200) {
      try {
        return { ok: true, orders: parseOrders(res.body) }
      } catch {
        console.warn('[ticket-api] Antwort nicht lesbar')
        return { ok: false, error: 'unavailable' }
      }
    }
    if (res.status >= 500 && attempt === 1) {
      console.warn(`[ticket-api] HTTP ${res.status}, einmalige Wiederholung`)
      continue
    }

    console.warn(`[ticket-api] HTTP ${res.status}`)
    switch (res.status) {
      case 400:
        return { ok: false, error: 'invalid_email' }
      case 401:
        await alertUnauthorized()
        return { ok: false, error: 'unauthorized' }
      case 403:
      case 404:
        return { ok: false, error: 'forbidden' }
      case 429:
        return { ok: false, error: 'rate_limited' }
      default:
        return { ok: false, error: 'unavailable' }
    }
  }
  return { ok: false, error: 'unavailable' }
}

// --- Alarmierung bei 401 -------------------------------------------------------

const ALERT_INTERVAL_MS = 60 * 60 * 1000
let lastAlertAt = 0

/** Token ungültig/abgelaufen/gesperrt → Betrieb per Mail informieren (höchstens stündlich). */
async function alertUnauthorized(): Promise<void> {
  console.error('[ticket-api] HTTP 401 – Token fehlt, ist ungültig, abgelaufen oder gesperrt')
  const to = alertEmail()
  if (!to || Date.now() - lastAlertAt < ALERT_INTERVAL_MS) return
  lastAlertAt = Date.now()
  try {
    const payload = await payloadClient()
    await payload.sendEmail({
      to,
      subject: '[LüMobil Hilfecenter] Ticket-API: Token abgelehnt (HTTP 401)',
      text:
        'Die LüMobil Ticket-API hat das Token des Hilfecenters abgelehnt (HTTP 401).\n' +
        'Mögliche Ursachen: Token abgelaufen, gesperrt oder falsch hinterlegt.\n\n' +
        'Maßnahme: neues Token beim API-Betrieb anfordern und in der Datei aus ' +
        'LUEMOBIL_API_TOKEN_FILE ersetzen (wirkt ohne Neustart).\n\n' +
        `Zeit: ${new Date().toLocaleString('de-DE')}`,
    })
  } catch (err) {
    console.error(`[ticket-api] Alarm-Mail fehlgeschlagen: ${(err as Error).message}`)
  }
}

// --- Mock (nur COCKPIT_MOCK=true ohne API-Konfiguration) -----------------------

function mockOrders(email: string): TicketOrder[] {
  if (email.trim().toLowerCase() !== 'anna.albers@example.de') return []
  return [
    { gekauft_am: '2026-09-01T06:02:11.12', bestellnummer: '1788436204117', produkt: 'Deutschlandticket 2.Kl', sku: '541', menge: 1, preis_brutto: '63.00', status: 'Versendet', erfolgreich: true },
    { gekauft_am: '2026-08-01T06:01:57.40', bestellnummer: '1785757317000', produkt: 'Deutschlandticket 2.Kl', sku: '541', menge: 1, preis_brutto: '58.00', status: 'Abgebrochen', erfolgreich: false },
  ]
}
