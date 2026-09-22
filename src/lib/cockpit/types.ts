/**
 * Gemeinsame Typen des Migrations-Cockpits — bewusst framework-unabhängig,
 * damit Datenschicht (Keycloak/Aboonline), API-Routen und UI dasselbe Modell
 * teilen.
 */

/** Ein in Keycloak gefundener Benutzer (nur die benötigten Felder). */
export type KcUser = {
  id: string
  email: string
  /** Kundennummer aus dem Altsystem (Attribut), falls vorhanden. */
  kundennummer?: string
  /** Anlagedatum (ISO 8601) — entspricht dem ersten migrierten Login. */
  createdAt: string
}

/** Keycloak-Event-Typ (z. B. LOGIN, LOGIN_ERROR, REGISTER, RESET_PASSWORD …). */
export type KcEventType = string

/** Ein Event aus der Keycloak-Event-API. */
export type KcEvent = {
  time: string // ISO 8601
  type: KcEventType
  /** Fehlerursache (nur bei *_ERROR), z. B. „user_not_found". */
  error?: string
  clientId?: string
  /** Keycloak-User-ID (stabil, für eindeutige Nutzerzählung). */
  userId?: string
  /** Benutzername/E-Mail aus dem Event (Details.username). */
  username?: string
  ipAddress?: string
}

/** Ergebnis der Aboonline-AccountCheck-Abfrage. */
export type AboResult =
  | { state: 'found'; kundennummer: string; createdAt?: string }
  | { state: 'not_found' }
  /** Webservice nicht erreichbar / Token ungültig — NIE als „existiert nicht". */
  | { state: 'error'; reason: string }

/** Zustand einer einzelnen Prüfstufe im Kundencheck. */
export type StepState = 'ok' | 'warn' | 'no' | 'off'

export type DiagnosisStep = {
  state: StepState
  /** Kurzstatus, z. B. „Migriert" / „Nicht vorhanden". */
  label: string
  /** Erläuternder Detailtext (kann eine Kundennummer enthalten). */
  detail: string
}

export type VerdictKind = 'ok' | 'warn' | 'no'

/** Ein einzelnes Ereignis in der „Letzte Ereignisse"-Liste. */
export type EventItem = {
  /** Formatiert „TT.MM., HH:MM Uhr". */
  time: string
  kind: 'ok' | 'no'
  /** z. B. „Erfolgreicher Login" oder der Fehlername. */
  label: string
  clientId?: string
}

/** Gültigkeitsstatus eines einzelnen Patris-Tickets (bezogen auf „jetzt"). */
export type TicketStatus = 'aktiv' | 'zukuenftig' | 'abgelaufen'

/** Ein Ticket laut Patris, fertig formatiert für die Anzeige. */
export type TicketItem = {
  entitlementId: string
  productName: string
  productNumber: string
  /** TT.MM.JJJJ oder leer. */
  validFrom: string
  validUntil: string
  customerNumber: string
  firstName: string
  lastName: string
  status: TicketStatus
}

/** Eine Position einer Bestellung in der LüMobil-App (Ticket-API). */
export type PurchaseItem = {
  produkt: string
  sku: string
  menge: number
  /** Formatiert, z. B. „63,00 €" (Einzelpreis brutto). */
  preis: string
  status: string
  erfolgreich: boolean
}

/** Eine Bestellung (Positionen gruppiert nach Bestellnummer). */
export type PurchaseOrder = {
  bestellnummer: string
  /** „TT.MM.JJJJ, HH:MM Uhr" (deutsche Ortszeit). */
  gekauftAm: string
  items: PurchaseItem[]
}

/** Ampelfarbe (grün / gelb / rot / aus). */
export type Lamp = 'ok' | 'warn' | 'no' | 'off'

/** Ergebnis des Kundenchecks: Ticket-Ampel + Keycloak-Status + Ereignisse. */
export type Diagnosis = {
  keycloak: DiagnosisStep
  /** Bis zu 10 letzte Ereignisse, neueste zuerst. */
  events: EventItem[]
  ticket: {
    lamp: Lamp
    /** Kurzstatus, z. B. „Gültig bis 31.12.2026". */
    label: string
    /** Relevantestes Ticket zuerst (gültig → zukünftig → abgelaufen). */
    tickets: TicketItem[]
    /** Stand der Patris-Daten („TT.MM.JJJJ, HH:MM Uhr") oder null ohne Upload. */
    dataAsOf: string | null
  }
  /** Bestellungen in der LüMobil-App (Ticket-API), neueste zuerst. */
  purchases: {
    /** error = Ticket-API nicht erreichbar/nicht konfiguriert (message erklärt es). */
    state: 'ok' | 'error'
    message?: string
    orders: PurchaseOrder[]
  }
  /** Hinweis für das Servicecenter (Texte aus dem CMS). */
  verdict: { kind: Lamp; title: string; text: string }
}

/** Ein Tages-Aggregat der Zeitreihe (entspricht der Collection cockpit-daily). */
export type DailyPoint = {
  /** Datum im Format JJJJ-MM-TT. */
  datum: string
  logins: number
  loginErrors: number
  /** Neu im Realm angelegte Nutzer (createdTimestamp) — migriert + registriert. */
  newUsers: number
  /** Davon Selbstregistrierungen (REGISTER-Events). */
  registrations: number
}

/** Ein Zeit-Bucket der Intraday-Reihen (Stunde bzw. Minute). */
export type IntradayPoint = {
  /** Achsenbeschriftung, z. B. „14 Uhr" oder „14:35". */
  label: string
  logins: number
  loginErrors: number
}

/** Abgeleitete Keycloak-Kennzahlen der letzten 24 Stunden. */
export type Keycloak24hMetrics = {
  /** Eindeutige Nutzer mit erfolgreichem Login. */
  uniqueUsers: number
  /** Genutzte Clients (App/Web) mit Aktivität. */
  activeClients: number
  logins: number
  errors: number
}

/** Intraday-Reihen: letzte 24 Stunden (stündlich) und letzte Stunde (minütlich). */
export type Intraday = {
  hourly: IntradayPoint[]
  minutely: IntradayPoint[]
  metrics: Keycloak24hMetrics
  mock: boolean
}

/** KPI-Kennzahlen der letzten 24 Stunden. */
export type CockpitKpis = {
  successfulLogins: number
  failedLogins: number
  /** Fehlerquote in Prozent (0–100), eine Nachkommastelle. */
  errorRatePct: number
  /** Neu angelegte Nutzer in den letzten 24 Stunden. */
  newUsers24h: number
  /** Alle Realm-Nutzer gesamt. */
  totalUsers: number
}

/** KPIs + Zeitreihen für die Cockpit-Startseite. */
export type CockpitStats = {
  kpis: CockpitKpis
  /** Tageswerte der letzten 14 Tage (aufsteigend nach Datum). */
  series: DailyPoint[]
  /** Veränderung der erfolgreichen Logins ggü. Vortag in Prozent (null = kein Vortag). */
  loginTrendPct: number | null
  /** true, wenn diese Werte aus Mock-Daten stammen. */
  mock: boolean
}

/** Support-relevante Event-Kennzahlen eines Zeitfensters. */
export type SupportMetrics = {
  passwordResetRequested: number
  passwordResetDone: number
  passwordChanged: number
  verifyEmailSent: number
  verifyEmailDone: number
  registrations: number
}

/** Logins je Client (App-Fläche) inkl. eindeutiger Nutzer. */
export type ClientLogin = { clientId: string; count: number; uniqueUsers: number }

/** Ein Zeit-Bucket mit Zähler (für den Neue-Nutzer-Graph). */
export type CountPoint = { label: string; count: number }

/** Neu angelegte Nutzer je Zeitfenster (Buckets + Gesamtsumme). */
export type NewUsers = {
  hour: CountPoint[]
  day: CountPoint[]
  week: CountPoint[]
  month: CountPoint[]
  totals: { hour: number; day: number; week: number; month: number }
  mock: boolean
}

/** Zustand eines einzelnen Dienstes für die Status-Ampel. */
export type ServiceHealth = {
  /** true = erreichbar/ok. */
  ok: boolean
  /** Antwortzeit in ms (null = nicht gemessen). */
  ms: number | null
  /** false = nicht konfiguriert (Ampel grau). */
  configured: boolean
  /** Kurzhinweis (z. B. Fehlergrund). */
  note?: string
}

/** Systemstatus (Live-Ampel). */
export type Health = {
  keycloak: ServiceHealth
  database: ServiceHealth
  /** Synthetischer Login (Testuser) — Ende-zu-Ende-Prüfung. */
  login: ServiceHealth
  mock: boolean
}

/** Betriebs-/Support-Kennzahlen (Live aus der Event-API). */
export type Operations = {
  support24h: SupportMetrics
  support7d: SupportMetrics
  loginsByClient: ClientLogin[]
  mock: boolean
}

/** Ein Zeit-Segment des Verfügbarkeitsstreifens (fester Zeitraum). */
export type AvailabilitySegment = {
  /** ok = Dienst antwortete · down = ≥1 Fehlversuch · none = keine Messung. */
  state: 'ok' | 'down' | 'none'
  /** Zeitspanne des Segments, z. B. „14:00–14:24 Uhr". */
  label: string
  /** Checks im Segment gesamt. */
  samples: number
  /** Davon fehlgeschlagen (nur relevant bei state=down). */
  downSamples: number
  /** Geschätzte Störminuten im Segment (Anteil fehlgeschlagener Checks × Segmentdauer). */
  downMinutes: number
}

/** Verfügbarkeit eines Dienstes im Beobachtungsfenster (aus health-checks). */
export type AvailabilitySvc = {
  key: 'keycloak' | 'login' | 'database'
  label: string
  /** Aktueller Zustand aus dem jüngsten Check. */
  current: 'ok' | 'down' | 'none'
  /** Uptime in Prozent (0–100), eine Nachkommastelle. */
  uptimePct: number
  /** false = im Fenster nie konfiguriert (grau, aus der Wertung). */
  configured: boolean
  /** Zeit-Segmente (alt → neu), fester Raster von bucketMinutes. */
  segments: AvailabilitySegment[]
  /** Konfigurierte Messpunkte im Fenster (Nenner der Uptime). */
  samples: number
  /** Davon fehlgeschlagen. */
  downSamples: number
  /** Anzahl Störungs-Zeitfenster (Segmente mit Fehler). */
  outages: number
  /** Zeitpunkt der letzten Störung (formatiert) oder null. */
  lastOutage: string | null
}

/** Verfügbarkeits-Historie (Statuspage-Streifen) über ein Zeitfenster. */
export type Availability = {
  /** Fenster-Beschriftung, z. B. „letzte 24 Stunden". */
  windowLabel: string
  /** Dauer eines Segments in Minuten (für die Erklärung). */
  bucketMinutes: number
  services: AvailabilitySvc[]
  /** Zeitpunkt des letzten Checks (formatiert) oder null. */
  lastCheck: string | null
  mock: boolean
}

/** Aggregierte Fehlerart mit Kurzerklärung. */
export type ErrorTypeAgg = {
  error: string
  count: number
  explanation: string
}

/** Auffälligkeit: mehrfache Fehlversuche mit identischem, unbekanntem Nutzer. */
export type Anomaly = {
  username: string
  count: number
  clientId?: string
  ipHint?: string
}

/** Fehlerliste eines Tages + Aggregation + Auffälligkeiten. */
export type DayEvents = {
  day: string
  rows: {
    time: string // HH:MM
    error: string
    clientId: string
    username: string
  }[]
  byType: ErrorTypeAgg[]
  anomalies: Anomaly[]
  mock: boolean
}
