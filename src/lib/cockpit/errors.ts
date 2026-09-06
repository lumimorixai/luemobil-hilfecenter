/**
 * Kurzerklärungen zu den häufigsten Keycloak-Login-Fehlern. Werden in der
 * Fehlerarten-Aggregation angezeigt, damit der Support die Ursache ohne
 * Keycloak-Wissen einordnen kann. Gilt für echte wie für Mock-Daten.
 */
export const ERROR_EXPLANATIONS: Record<string, string> = {
  user_not_found:
    'Weder in Keycloak noch im Aboonline – Tippfehler oder kein Kundenkonto',
  invalid_user_credentials:
    'Konto existiert, Passwort falsch – oder Passwortprüfung im Altsystem gestört',
  expired_code: 'Login-Vorgang zu lange offen, Kunde muss neu starten',
  invalid_client_credentials: 'Client-Konfiguration fehlerhaft – technischer Fehler',
  account_disabled: 'Konto ist deaktiviert',
  access_denied: 'Anmeldung vom Nutzer abgebrochen oder verweigert',
}

export function explainError(error: string): string {
  return ERROR_EXPLANATIONS[error] || 'Keycloak-Login-Fehler ohne hinterlegte Erklärung'
}
