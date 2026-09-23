/**
 * LüMobil-Dashboards (Metabase, statische Einbettung) — NUR serverseitig.
 *
 * Der Server prüft Anmeldung + Rolle und signiert erst dann ein kurzlebiges
 * JWT (HS256, 10 Minuten) für genau ein Dashboard. Der Browser lädt das
 * Dashboard direkt von METABASE_URL; dieser Server braucht keine Verbindung
 * zu Metabase.
 *
 * Sicherheit (Vorgaben des LüMobil-Betriebs):
 * - Schlüssel aus METABASE_EMBED_SECRET_FILE (bei jedem Aufruf neu gelesen →
 *   Schlüsselwechsel ohne Deployment/Neustart), ersatzweise METABASE_EMBED_SECRET.
 * - Schlüssel und iframe-URLs (enthalten das Token) werden nie geloggt und nie
 *   an den Browser gegeben — außer der fertigen URL für berechtigte Personen.
 *
 * Bewusst ohne JWT-Bibliothek: HS256 ist mit node:crypto in wenigen Zeilen
 * umgesetzt.
 */
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { canCockpit, supportRole } from './auth/guard'
import { hasRole, type CockpitSession } from './auth/session'

/** Gültigkeit eines Tokens (Vorgabe: höchstens 10 Minuten). */
export const TOKEN_TTL_SECONDS = 10 * 60

export type Dashboard = {
  /** Schlüssel aus METABASE_DASHBOARDS, z. B. „ueberblick". */
  key: string
  /** Metabase-Dashboard-ID. */
  id: number
  title: string
  /** Kurzbeschreibung unter dem Reiter. */
  description: string
  /**
   * Höhe des Dashboard-Rasters: Metabase skaliert die Kacheln mit der Breite.
   * base = Rasterhöhe bei 1200 px Breite, slope = zusätzliche Höhe je px Breite
   * (gemessen 22.09.2026 an der Demo, gültig ca. 1200–1600 px).
   */
  sizing: DashboardSizing
}

export type DashboardSizing = { base: number; slope: number }

/** Anzeigenamen/Höhen der bekannten Dashboards; unbekannte Schlüssel bekommen Standardwerte. */
const DEFAULT_SIZING: DashboardSizing = { base: 1500, slope: 1 }

const KNOWN: Record<string, Omit<Dashboard, 'key' | 'id'>> = {
  ueberblick: {
    title: 'Überblick',
    description: 'Umsatz, Verkäufe, Käufer, Konten, Tagesverlauf, Produktmix und Kanäle.',
    sizing: { base: 1259, slope: 0.86 },
  },
  abo: {
    title: 'Abo-Bestand',
    description: 'Berechtigungen, Aktivierungsquote, Trichter, Segmente und Aktivierung je PLZ.',
    sizing: { base: 1455, slope: 1.0 },
  },
  payone: {
    title: 'Einzeltickets (PayOne)',
    description: 'Tarifkatalog, Preisstufen, Preispunkte und Gültigkeitsregeln.',
    sizing: { base: 1406, slope: 0.97 },
  },
  betrieb: {
    title: 'Betrieb & Störungen',
    description: 'Erfolgsquote, Durchlaufzeit, Abbrüche, Plattformen und Arbeitslisten (enthält einzelne Bestellungen).',
    sizing: { base: 1406, slope: 0.97 },
  },
}

/**
 * Wer welches Dashboard sehen darf, wenn METABASE_DASHBOARD_ROLES nichts
 * anderes sagt: alle mit Cockpit-Berechtigung — außer „betrieb" (Bestelldaten),
 * das nur die Rolle support sieht.
 */
const DEFAULT_ROLES: Record<string, () => string[]> = {
  betrieb: () => [supportRole()],
}

export function metabaseUrl(): string {
  return (process.env.METABASE_URL || '').replace(/\/+$/, '')
}

/**
 * Schlüssel frisch lesen (Datei bevorzugt), damit ein Austausch sofort wirkt.
 * Leerzeichen und Umbrüche werden entfernt — der Schlüssel enthält keine, beim
 * Einfügen ins Terminal entstehen sie aber leicht.
 */
function readSecret(): string {
  const file = process.env.METABASE_EMBED_SECRET_FILE
  const raw = file
    ? (() => {
        try {
          return readFileSync(file, 'utf8')
        } catch {
          return ''
        }
      })()
    : process.env.METABASE_EMBED_SECRET || ''
  return raw.replace(/\s+/g, '')
}

export function metabaseConfigured(): boolean {
  return Boolean(metabaseUrl() && readSecret() && dashboards().length > 0)
}

/** METABASE_DASHBOARDS=ueberblick:6,abo:7,… → Liste in dieser Reihenfolge. */
export function dashboards(): Dashboard[] {
  const out: Dashboard[] = []
  for (const part of (process.env.METABASE_DASHBOARDS || '').split(',')) {
    const [rawKey, rawId] = part.split(':').map((s) => (s ?? '').trim())
    const id = Number(rawId)
    if (!rawKey || !/^[a-z0-9_-]+$/i.test(rawKey) || !Number.isInteger(id) || id <= 0) continue
    const key = rawKey.toLowerCase()
    const known = KNOWN[key]
    out.push({
      key,
      id,
      title: known?.title ?? key.charAt(0).toUpperCase() + key.slice(1),
      description: known?.description ?? '',
      sizing: known?.sizing ?? DEFAULT_SIZING,
    })
  }
  return out
}

/** METABASE_DASHBOARD_ROLES=betrieb:support|controlling,abo:cockpit → Rollen je Schlüssel. */
function configuredRoles(): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const part of (process.env.METABASE_DASHBOARD_ROLES || '').split(',')) {
    const [key, roles] = part.split(':').map((s) => (s ?? '').trim())
    if (!key || !roles) continue
    out[key.toLowerCase()] = roles.split('|').map((r) => r.trim()).filter(Boolean)
  }
  return out
}

/** Darf diese Session dieses Dashboard sehen? (Prüfung VOR jeder Token-Erzeugung.) */
export function canSeeDashboard(session: CockpitSession | null, key: string): boolean {
  if (!session) return false
  const roles = configuredRoles()[key] ?? DEFAULT_ROLES[key]?.()
  if (roles) return roles.some((r) => hasRole(session, r))
  return canCockpit(session)
}

/** Alle Dashboards, die die Session sehen darf (leer, wenn nicht konfiguriert). */
export function visibleDashboards(session: CockpitSession | null): Dashboard[] {
  if (!metabaseConfigured()) return []
  return dashboards().filter((d) => canSeeDashboard(session, d.key))
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url')
}

/** JWT HS256 für genau ein Dashboard, gültig TOKEN_TTL_SECONDS. */
function signToken(dashboardId: number, secret: string): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64url(
    JSON.stringify({
      resource: { dashboard: dashboardId },
      params: {},
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    }),
  )
  const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${signature}`
}

/**
 * iframe-URL für ein Dashboard — nur nach bestandener Rechteprüfung aufrufen.
 * Liefert null, wenn Metabase nicht konfiguriert ist.
 */
export function dashboardEmbedUrl(dashboard: Dashboard): string | null {
  const secret = readSecret()
  const base = metabaseUrl()
  if (!secret || !base) return null
  return `${base}/embed/dashboard/${signToken(dashboard.id, secret)}#bordered=false&titled=true`
}
