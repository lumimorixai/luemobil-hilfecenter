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
  /** Kurzer Name für den Reiter, ohne Nummer. */
  title: string
  /**
   * Nummer des Boards in Metabase („3" für „3 — Einzeltickets und PayOne").
   * Wird neben dem Titel angezeigt, weil die Boards sich in ihren Kopfzeilen
   * gegenseitig per Nummer zitieren („Die Abo-Verlängerung: siehe Board 6").
   */
  nummer: number | null
  /** Kurzbeschreibung unter dem Reiter. */
  description: string
  /**
   * Höhe des Dashboard-Rasters: Metabase skaliert die Kacheln mit der Breite.
   * base = Rasterhöhe bei 1200 px Breite, slope = zusätzliche Höhe je px Breite
   * (gültig ca. 1200–1600 px).
   */
  sizing: DashboardSizing
}

export type DashboardSizing = { base: number; slope: number }

/**
 * Höhe aus der Zahl der Rasterzeilen eines Boards.
 *
 * Metabase legt die Kacheln in ein Raster aus 24 Spalten; die Höhe eines Boards
 * ist damit die größte belegte Zeile. Die beiden Faktoren sind am 22.09.2026 an
 * der Demo gemessen und stimmen für die Boards „Abo-Bestand" (30 Zeilen →
 * 1455 px, Steigung 1,00) und „Betrieb und Störungen" (29 → 1406, 0,97) auf
 * ein Promille überein — also 48,5 px je Zeile und 1/30 Steigung je Zeile.
 *
 * So lässt sich ein neues oder umgebautes Board eintragen, ohne es am
 * Bildschirm auszumessen: Zeilenzahl aus `metabase-setup/14_dashboards.py` im
 * Reporting-Projekt (größtes row + size_y je Board) hier eintragen. Sitzt die
 * Höhe sichtbar daneben, ist Nachmessen weiterhin erlaubt — dann aber mit
 * Datum im Kommentar.
 */
function sizingFuerRaster(zeilen: number): DashboardSizing {
  return { base: Math.round(zeilen * 48.5), slope: Math.round((zeilen / 30) * 100) / 100 }
}

/**
 * Die Boards des LüMobil-Reportings, Stand 21.10.2026.
 *
 * Quelle: `metabase-setup/EINBINDUNG_DASHBOARDS_HILFECENTER.md` und
 * `metabase-setup/14_dashboards.py` im Reporting-Projekt. Die IDs stehen
 * bewusst NICHT hier, sondern in METABASE_DASHBOARDS — in Produktion lauten
 * sie anders als in der Demo.
 *
 * Unbekannte Schlüssel bekommen den Schlüssel als Titel und Standardwerte;
 * ein neues Board erscheint also auch ohne Eintrag hier, nur ohne Beschreibung
 * und mit grob geschätzter Höhe.
 */
const DEFAULT_SIZING: DashboardSizing = sizingFuerRaster(31)

const KNOWN: Record<string, Omit<Dashboard, 'key' | 'id'>> = {
  ueberblick: {
    title: 'Überblick',
    nummer: 1,
    description:
      'Umsatz, Verkäufe, Ø Bon, Käufer, Konten, Tagesverlauf, Tickets je Kanal und Produktmix seit Marktstart.',
    sizing: sizingFuerRaster(28),
  },
  abo: {
    title: 'Abo-Bestand',
    nummer: 2,
    description:
      'Berechtigungen, Aktivierungsquote, Trichter, Segmente, Altersprofil und Aktivierung je Postleitzahl. Der Bestand wird monatlich vollständig ersetzt.',
    sizing: sizingFuerRaster(30),
  },
  payone: {
    title: 'Einzeltickets und PayOne',
    nummer: 3,
    description:
      'Erfolgsquote und Abbruchgründe bei PayOne, Umsatz ÖPNV und Fähre, häufigste Relationen, Erstattungen und Tarifkatalog (enthält einzelne Bestellungen).',
    sizing: sizingFuerRaster(49),
  },
  betrieb: {
    title: 'Betrieb und Störungen',
    nummer: 4,
    description:
      'Erfolgsquote, Durchlaufzeit, Abbrüche, Plattformen und Arbeitslisten (enthält einzelne Bestellungen).',
    sizing: sizingFuerRaster(29),
  },
  monatsbilanz: {
    title: 'Monatsbilanz Abo',
    nummer: 5,
    description:
      'Wer im laufenden Monat berechtigt ist, ein App-Konto hat und ein gültiges Abo-Ticket bekommen hat — mit Kundenbindung, Altersgruppen und Postleitzahlen.',
    sizing: sizingFuerRaster(33),
  },
  verlaengerung: {
    title: 'Abo-Verlängerung',
    nummer: 6,
    description:
      'Der Verlängerungslauf am 27.: was ansteht, was durchgelaufen ist und welche Abos gestört sind.',
    sizing: sizingFuerRaster(23),
  },
  nutzung: {
    title: 'App-Nutzung',
    nummer: 7,
    description:
      'Konten, Neuanmeldungen, Einwilligungen und Kaufverhalten. Logins bleiben außen vor — die Quelle pflegt den letzten Login nicht.',
    sizing: sizingFuerRaster(28),
  },
}

/**
 * Wer welches Dashboard sehen darf, wenn METABASE_DASHBOARD_ROLES nichts
 * anderes sagt: alle mit Cockpit-Berechtigung — außer den Boards mit einzelnen
 * Bestellungen, die nur die Rolle support sieht.
 *
 * „payone" steht seit dem 21.10.2026 in dieser Liste: Das Board zeigt seit dem
 * Umbau die Tabelle „Erstattungen im Einzelnen" mit Bestellnummer und Betrag.
 * Damit gilt für es dieselbe Regel wie für „betrieb" — nicht neu entschieden,
 * sondern die bestehende Regel auf einen geänderten Inhalt angewendet.
 */
const DEFAULT_ROLES: Record<string, () => string[]> = {
  payone: () => [supportRole()],
  betrieb: () => [supportRole()],
}

export function metabaseUrl(): string {
  return (process.env.METABASE_URL || '').replace(/\/+$/, '')
}

/**
 * Adresse für die Erreichbarkeitsprüfung — nicht die öffentliche.
 *
 * Über den Reverse Proxy sind absichtlich nur die Einbettungspfade
 * (/embed/*, /api/embed/*, /app/*) erreichbar; /api/health beantwortet er mit
 * 404. Die Ampel stand deshalb auf Rot, obwohl Metabase lief. Geprüft wird
 * daher im Docker-Netz (http://metabase:3000), wo beide Container ohnehin
 * miteinander sprechen. Ohne METABASE_HEALTH_URL gilt die öffentliche Adresse —
 * das passt für die Entwicklung, wo Metabase direkt erreichbar ist.
 */
export function metabaseHealthUrl(): string {
  return (process.env.METABASE_HEALTH_URL || process.env.METABASE_URL || '').replace(/\/+$/, '')
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

/** METABASE_DASHBOARDS=ueberblick:6,abo:7,…,nutzung:12 → Liste in dieser Reihenfolge. */
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
      nummer: known?.nummer ?? null,
      description: known?.description ?? '',
      sizing: known?.sizing ?? DEFAULT_SIZING,
    })
  }
  return out
}

/** METABASE_DASHBOARD_ROLES=betrieb:support|controlling,payone:cockpit → Rollen je Schlüssel. */
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
