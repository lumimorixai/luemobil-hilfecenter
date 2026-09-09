/**
 * Zentrale Konfiguration des Migrations-Cockpits. Alle Werte kommen aus
 * Umgebungsvariablen — nichts wird hartkodiert. Secrets (Client-Secret,
 * Abo-Token) werden ausschließlich hier serverseitig gelesen und dürfen nie
 * ins Frontend, in Logs oder in Fehlermeldungen gelangen.
 *
 * Solange `COCKPIT_MOCK=true` gesetzt ist, laufen Keycloak- und Aboonline-
 * Zugriffe gegen eingebaute Mock-Daten (Entwicklung ohne echte Systeme).
 */

export type CockpitEnv = 'dev' | 'test' | 'live'

/** Mock-Modus: keine echten externen Systeme, feste Demo-Daten. */
export function isMock(): boolean {
  return process.env.COCKPIT_MOCK === 'true'
}

/** Umgebungs-Kennung für das Badge im Kopf (Dev/Test/Live). */
export function cockpitEnv(): CockpitEnv {
  const raw = (process.env.COCKPIT_ENV || '').toLowerCase()
  if (raw === 'live' || raw === 'prod' || raw === 'production') return 'live'
  if (raw === 'test' || raw === 'stage' || raw === 'staging') return 'test'
  return 'dev'
}

/** Anzeigename der Umgebung. */
export function cockpitEnvLabel(): string {
  return { dev: 'Dev-System', test: 'Test-System', live: 'Live-System' }[cockpitEnv()]
}

/** Keycloak-Basis-URL ohne abschließenden Schrägstrich. */
export function keycloakUrl(): string {
  return (process.env.KEYCLOAK_URL || '').replace(/\/$/, '')
}

/** Daten-Realm (Kunden): Quelle für Admin-API (Nutzer, Events). */
export function keycloakRealm(): string {
  return process.env.KEYCLOAK_REALM || 'mpluebeck'
}

/**
 * Login-Realm (Mitarbeitende) für den OIDC-Login. Ist er nicht gesetzt, wird der
 * Daten-Realm verwendet (Einzel-Realm-Betrieb, abwärtskompatibel).
 */
export function authRealm(): string {
  return process.env.KEYCLOAK_AUTH_REALM || keycloakRealm()
}

/** Login-Client (im Login-Realm). Fällt auf den Cockpit-Client zurück. */
export function oidcClientId(): string {
  return process.env.OIDC_CLIENT_ID || process.env.COCKPIT_CLIENT_ID || ''
}
export function oidcClientSecret(): string {
  return process.env.OIDC_CLIENT_SECRET || process.env.COCKPIT_CLIENT_SECRET || ''
}

/**
 * Synthetischer Login-Check: prüft die KUNDEN-Anmeldung. Realm = Kunden-Realm
 * (Standard mpluebeck), eigener Client mit „Direct Access Grants" + Testkunde.
 */
export function synthLoginRealm(): string {
  return process.env.SYNTH_LOGIN_REALM || keycloakRealm()
}
export function synthClientId(): string {
  return process.env.SYNTH_LOGIN_CLIENT_ID || process.env.COCKPIT_CLIENT_ID || ''
}
export function synthClientSecret(): string {
  return process.env.SYNTH_LOGIN_CLIENT_SECRET || process.env.COCKPIT_CLIENT_SECRET || ''
}

/**
 * Client-IDs, deren Events NICHT als echte Nutzeraktivität zählen: der
 * Cockpit-/Service-Account-Client und der synthetische Login-Client. Deren
 * (minütliche) Test-LOGINs würden sonst Logins, Fehler und Client-Statistik
 * verfälschen.
 */
export function monitoringClientIds(): string[] {
  const ids = [process.env.COCKPIT_CLIENT_ID, process.env.SYNTH_LOGIN_CLIENT_ID, synthClientId()]
    .map((s) => (s || '').trim())
    .filter(Boolean)
  return Array.from(new Set(ids))
}

/** Nenner für den Migrationsfortschritt (Gesamtkundenzahl). */
export function kundenGesamt(): number {
  const n = Number(process.env.COCKPIT_KUNDEN_GESAMT)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** Empfänger der Störungs-Benachrichtigungen (leer = kein Mail-Alerting). */
export function alertEmail(): string {
  return process.env.ALERT_EMAIL || ''
}

/** Wie viele Fehlversuche in Folge, bevor alarmiert wird (Standard 2). */
export function alertThreshold(): number {
  const n = Number(process.env.ALERT_FAIL_THRESHOLD)
  return Number.isFinite(n) && n >= 1 ? n : 2
}

/** Aboonline-Webservice-Basis ohne abschließenden Schrägstrich. */
export function aboWsUrl(): string {
  return (process.env.ABO_WS_URL || '').replace(/\/$/, '')
}

/**
 * Prüft, ob die echten Keycloak-Zugangsdaten vollständig konfiguriert sind.
 * Im Mock-Modus irrelevant.
 */
export function keycloakConfigured(): boolean {
  return Boolean(
    process.env.KEYCLOAK_URL &&
      process.env.COCKPIT_CLIENT_ID &&
      process.env.COCKPIT_CLIENT_SECRET,
  )
}
