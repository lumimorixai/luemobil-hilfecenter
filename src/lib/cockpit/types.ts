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

/** Ergebnis des Kundenchecks: Keycloak-Status + letzte Ereignisse + Verdikt. */
export type Diagnosis = {
  keycloak: DiagnosisStep
  /** Bis zu 10 letzte Ereignisse, neueste zuerst. */
  events: EventItem[]
  verdict: { kind: VerdictKind; text: string }
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
  newMigrated: number
  /** Migrierte (föderierte) Nutzer gesamt. */
  totalMigrated: number
  /** Alle Realm-Nutzer gesamt (migriert + lokal + registriert). */
  totalUsers: number
  /** Migrationsfortschritt in Prozent (0–100), ganzzahlig gerundet. */
  progressPct: number
  /** Nenner für den Fortschritt (0 = nicht konfiguriert). */
  kundenGesamt: number
}

/** KPIs + Zeitreihen für die Cockpit-Startseite. */
export type CockpitStats = {
  kpis: CockpitKpis
  /** Tageswerte der letzten 14 Tage (aufsteigend nach Datum). */
  series: DailyPoint[]
  /** Kumulierte migrierte Kunden je Tag (aufsteigend, deckungsgleich zu series). */
  cumulativeMigrated: { datum: string; total: number }[]
  /** Migrationen vs. Neuregistrierungen je Tag (14 Tage). */
  migrationSeries: { datum: string; migrated: number; registered: number }[]
  /** Neu registrierte Kunden heute (Selbstregistrierung). */
  newRegistered: number
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

/** Logins je Client (App-Fläche). */
export type ClientLogin = { clientId: string; count: number }

/** Betriebs-/Support-Kennzahlen (Live aus der Event-API). */
export type Operations = {
  support24h: SupportMetrics
  support7d: SupportMetrics
  loginsByClient: ClientLogin[]
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
