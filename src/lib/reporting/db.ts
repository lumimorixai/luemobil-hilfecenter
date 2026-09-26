/**
 * Leseverbindung zur Reporting-Datenbank `lue_reporting`.
 *
 * Grundsätze (bewusst eng gefasst):
 * - Eigener Datenbank-Benutzer, der NUR lesen darf, und zwar nur die vier
 *   aggregierten Views ohne Personenbezug (siehe docs/REPORTING.md).
 * - Nur serverseitig. Die Zugangsdaten stehen in REPORTING_DATABASE_URI bzw. in
 *   der Datei REPORTING_DATABASE_URI_FILE (Docker-Secret) und verlassen den
 *   Server nie Richtung Browser.
 * - Jede Abfrage bekommt ein Zeitlimit und wird lesend ausgeführt; die
 *   Verbindung ist zusätzlich als `default_transaction_read_only` gesetzt.
 * - Fehler werden nie geworfen, sondern als „nicht verfügbar" gemeldet: Das
 *   Cockpit soll auch dann funktionieren, wenn das Reporting gerade neu
 *   aufgebaut wird.
 */
import { readFileSync } from 'node:fs'
import { Pool } from 'pg'

const STATEMENT_TIMEOUT_MS = 8000

function verbindungsString(): string {
  const datei = process.env.REPORTING_DATABASE_URI_FILE
  if (datei) {
    try {
      return readFileSync(datei, 'utf8').trim()
    } catch {
      return ''
    }
  }
  return (process.env.REPORTING_DATABASE_URI || '').trim()
}

export function reportingConfigured(): boolean {
  return verbindungsString().startsWith('postgres')
}

let pool: Pool | null = null
let poolFuer = ''

function getPool(): Pool | null {
  const uri = verbindungsString()
  if (!uri) return null
  // Wechselt die Verbindungszeichenfolge (Passwortwechsel ohne Deployment),
  // wird der alte Pool verworfen.
  if (pool && poolFuer !== uri) {
    void pool.end().catch(() => undefined)
    pool = null
  }
  if (!pool) {
    pool = new Pool({
      connectionString: uri,
      max: 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5000,
      statement_timeout: STATEMENT_TIMEOUT_MS,
      application_name: 'luemobil-hilfecenter-cockpit',
      options: '-c default_transaction_read_only=on',
    })
    pool.on('error', () => {
      // Verbindungsfehler im Leerlauf dürfen den Prozess nicht beenden.
    })
    poolFuer = uri
  }
  return pool
}

/**
 * Führt eine lesende Abfrage aus. Gibt `null` zurück, wenn das Reporting nicht
 * konfiguriert oder nicht erreichbar ist — der Aufrufer zeigt dann einen
 * Hinweis statt einer Fehlerseite.
 */
export async function abfrage<T>(sql: string, params: unknown[] = []): Promise<T[] | null> {
  const p = getPool()
  if (!p) return null
  try {
    const res = await p.query(sql, params)
    return res.rows as T[]
  } catch {
    // Kein Logging der Abfrage: sie könnte Parameter enthalten.
    return null
  }
}

/** Erreichbarkeit für die Ampel: eine triviale Abfrage mit kurzer Frist. */
export async function reportingErreichbar(): Promise<{ ok: boolean; ms: number | null }> {
  if (!reportingConfigured()) return { ok: false, ms: null }
  const start = Date.now()
  const rows = await abfrage<{ eins: number }>('SELECT 1 AS eins')
  return { ok: rows !== null, ms: Date.now() - start }
}
