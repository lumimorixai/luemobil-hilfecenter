/**
 * Patris-Ticketdaten: CSV-Import (ersetzt den gesamten Bestand) und Abfrage
 * für den Kundencheck. Übernommen werden ausschließlich die Spalten aus
 * COLUMNS, alle anderen CSV-Felder werden verworfen.
 *
 * Bewusst ohne CSV-Bibliothek: kleiner RFC-4180-Parser (Anführungszeichen,
 * Zeilenumbrüche in Feldern), Trennzeichen ; , oder Tab wird erkannt.
 */
import { payloadClient } from '../content'
import { HINT_SITUATIONS, type HintSituationKey } from './hints'

/** Zielfeld → akzeptierte CSV-Spaltennamen (klein geschrieben). */
const COLUMNS = {
  entitlementId: ['entitlement_id'],
  validFrom: ['display_validity_begin'],
  validUntil: ['display_validity_end'],
  productNumber: ['product_mnumber', 'product_number'],
  productName: ['product_name'],
  customerNumber: ['customer_number'],
  email: ['email'],
  firstName: ['first_name'],
  lastName: ['last_name'],
} as const

type Field = keyof typeof COLUMNS

export type PatrisRow = {
  entitlementId: string
  validFrom: string | null
  validUntil: string | null
  productNumber: string
  productName: string
  customerNumber: string
  email: string
  firstName: string
  lastName: string
}

export type PatrisTicket = PatrisRow

export type PatrisStatus = {
  importedAt: string | null
  fileName: string | null
  importedBy: string | null
  rowCount: number
  skippedRows: number
}

export type ImportResult = {
  rowCount: number
  skippedRows: number
  /** Zeilen mit nicht lesbarem Datum (werden trotzdem übernommen, Datum leer). */
  invalidDates: number
}

/** Formatfehler der Datei — die Meldung ist für die Anzeige im Cockpit gedacht. */
export class PatrisImportError extends Error {}

// --- CSV ---------------------------------------------------------------------

function detectDelimiter(headerLine: string): string {
  const candidates = [';', ',', '\t']
  let best = ';'
  let bestCount = -1
  for (const c of candidates) {
    const count = headerLine.split(c).length - 1
    if (count > bestCount) {
      best = c
      bestCount = count
    }
  }
  return best
}

/** RFC-4180-Parser: liefert Zeilen als Feld-Arrays. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '')
  const firstBreak = src.search(/\r?\n/)
  const delim = detectDelimiter(firstBreak === -1 ? src : src.slice(0, firstBreak))

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"' && field === '') {
      inQuotes = true
    } else if (ch === delim) {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  // Leerzeilen ignorieren.
  return rows.filter((r) => r.some((f) => f.trim() !== ''))
}

// --- Datum -------------------------------------------------------------------

/**
 * Liest ISO (JJJJ-MM-TT[ HH:MM[:SS]][Zone]) und deutsches Format
 * (TT.MM.JJJJ[ HH:MM[:SS]]). Ohne Zeitzone gilt lokale Zeit (Europe/Berlin).
 * Reines Datum als Ende → Tagesende, damit der letzte Tag noch gilt.
 */
export function parseDate(raw: string, endOfDay: boolean): string | null | undefined {
  const s = raw.trim()
  if (!s) return null

  // Mit expliziter Zeitzone: direkt parsen.
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/.test(s)) {
    const t = Date.parse(s.replace(' ', 'T'))
    return Number.isNaN(t) ? undefined : new Date(t).toISOString()
  }

  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?$/)
  let y: number, mo: number, d: number
  let time: [number, number, number] | null = null
  if (m) {
    ;[y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
    if (m[4]) time = [Number(m[4]), Number(m[5]), Number(m[6] ?? 0)]
  } else {
    m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
    if (!m) return undefined
    ;[d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])]
    if (m[4]) time = [Number(m[4]), Number(m[5]), Number(m[6] ?? 0)]
  }

  const date = time
    ? new Date(y, mo - 1, d, time[0], time[1], time[2])
    : endOfDay
      ? new Date(y, mo - 1, d, 23, 59, 59, 999)
      : new Date(y, mo - 1, d)
  if (Number.isNaN(date.getTime()) || date.getMonth() !== mo - 1) return undefined
  return date.toISOString()
}

// --- Import ------------------------------------------------------------------

const MAX_LEN = 500

/** Wandelt den CSV-Text in Zeilen um; wirft PatrisImportError bei Formatfehlern. */
export function rowsFromCsv(text: string): { rows: PatrisRow[]; skippedRows: number; invalidDates: number } {
  const table = parseCsv(text)
  if (table.length < 2) throw new PatrisImportError('Die Datei enthält keine Datenzeilen.')

  const header = table[0].map((h) => h.trim().toLowerCase())
  const index = {} as Record<Field, number>
  const missing: string[] = []
  for (const [field, names] of Object.entries(COLUMNS) as [Field, readonly string[]][]) {
    const i = header.findIndex((h) => names.includes(h))
    if (i === -1) missing.push(names[0])
    index[field] = i
  }
  if (missing.length) {
    throw new PatrisImportError(`Folgende Spalten fehlen in der Datei: ${missing.join(', ')}.`)
  }

  const rows: PatrisRow[] = []
  let skippedRows = 0
  let invalidDates = 0
  for (const cells of table.slice(1)) {
    const get = (f: Field) => (cells[index[f]] ?? '').trim().slice(0, MAX_LEN)
    const entitlementId = get('entitlementId')
    if (!entitlementId) {
      skippedRows++
      continue
    }
    const validFrom = parseDate(get('validFrom'), false)
    const validUntil = parseDate(get('validUntil'), true)
    if (validFrom === undefined || validUntil === undefined) invalidDates++
    rows.push({
      entitlementId,
      validFrom: validFrom ?? null,
      validUntil: validUntil ?? null,
      productNumber: get('productNumber'),
      productName: get('productName'),
      customerNumber: get('customerNumber'),
      email: get('email').toLowerCase(),
      firstName: get('firstName'),
      lastName: get('lastName'),
    })
  }
  if (rows.length === 0) throw new PatrisImportError('Die Datei enthält keine gültigen Zeilen (entitlement_id leer).')
  return { rows, skippedRows, invalidDates }
}

/** Minimaler Ausschnitt der Drizzle-API, den der Bulk-Import braucht. */
type DrizzleTx = {
  delete(table: unknown): PromiseLike<unknown>
  insert(table: unknown): { values(values: Record<string, unknown>[]): PromiseLike<unknown> }
}
type DrizzleDb = { transaction<T>(fn: (tx: DrizzleTx) => Promise<T>): Promise<T> }

const CHUNK = 500

/**
 * Ersetzt den gesamten Patris-Bestand in EINER Transaktion (bei Fehlern bleibt
 * der alte Stand erhalten). Direkt über Drizzle, weil die Local API je Datensatz
 * eine eigene Transaktion bräuchte — bei zehntausenden Zeilen zu langsam.
 */
export async function importPatrisCsv(
  text: string,
  meta: { fileName: string; importedBy: string },
): Promise<ImportResult> {
  const { rows, skippedRows, invalidDates } = rowsFromCsv(text)
  const payload = await payloadClient()
  const adapter = payload.db as unknown as { drizzle: DrizzleDb; tables: Record<string, unknown> }
  const table = adapter.tables['patris_entitlements']
  if (!table) throw new Error('Tabelle patris_entitlements nicht gefunden')

  const now = new Date().toISOString()
  await adapter.drizzle.transaction(async (tx) => {
    await tx.delete(table)
    for (let i = 0; i < rows.length; i += CHUNK) {
      await tx
        .insert(table)
        .values(rows.slice(i, i + CHUNK).map((r) => ({ ...r, createdAt: now, updatedAt: now })))
    }
  })

  await payload.updateGlobal({
    slug: 'patris-import',
    data: { importedAt: now, fileName: meta.fileName, importedBy: meta.importedBy, rowCount: rows.length, skippedRows },
    overrideAccess: true,
  })

  return { rowCount: rows.length, skippedRows, invalidDates }
}

// --- Abfrage -----------------------------------------------------------------

export async function getPatrisStatus(): Promise<PatrisStatus> {
  const payload = await payloadClient()
  const g = await payload.findGlobal({ slug: 'patris-import', overrideAccess: true })
  return {
    importedAt: g.importedAt ?? null,
    fileName: g.fileName ?? null,
    importedBy: g.importedBy ?? null,
    rowCount: g.rowCount ?? 0,
    skippedRows: g.skippedRows ?? 0,
  }
}

/** Tickets zu einer E-Mail (und, falls bekannt, zur Kundennummer aus Keycloak). */
export async function findTickets(email: string, customerNumber?: string): Promise<PatrisTicket[]> {
  const payload = await payloadClient()
  const or: Record<string, { equals: string }>[] = [{ email: { equals: email.toLowerCase() } }]
  if (customerNumber) or.push({ customerNumber: { equals: customerNumber } })
  const found = await payload.find({
    collection: 'patris-entitlements',
    where: { or },
    limit: 50,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  return found.docs.map((d) => ({
    entitlementId: d.entitlementId,
    validFrom: d.validFrom ?? null,
    validUntil: d.validUntil ?? null,
    productNumber: d.productNumber ?? '',
    productName: d.productName ?? '',
    customerNumber: d.customerNumber ?? '',
    email: d.email ?? '',
    firstName: d.firstName ?? '',
    lastName: d.lastName ?? '',
  }))
}

/** Hinweistexte aus dem CMS, leere Felder mit den Standardtexten aufgefüllt. */
export async function getHints(): Promise<Record<HintSituationKey, { title: string; text: string }>> {
  const payload = await payloadClient()
  let cms: Record<string, { titel?: string | null; text?: string | null } | undefined> = {}
  try {
    cms = (await payload.findGlobal({ slug: 'kundencheck-hinweise', overrideAccess: true })) as unknown as typeof cms
  } catch {
    cms = {}
  }
  const out = {} as Record<HintSituationKey, { title: string; text: string }>
  for (const s of HINT_SITUATIONS) {
    out[s.key] = {
      title: cms[s.key]?.titel?.trim() || s.defaultTitle,
      text: cms[s.key]?.text?.trim() || s.defaultText,
    }
  }
  return out
}
