/**
 * Kundencheck: prüft den Keycloak-Status einer E-Mail und listet die letzten
 * Ereignisse. Daraus ein eindeutiges Verdikt (Handlungstext für den Support).
 *
 * Hinweis: Die Aboonline-Webservice-Prüfung ist derzeit deaktiviert (Endpoint
 * noch nicht verfügbar). Die Logik dafür liegt weiterhin in src/lib/aboonline.ts
 * und kann später wieder als zweite Stufe eingehängt werden.
 */
import { findUserByEmail, getRecentUserEvents } from '../keycloak'
import { keycloakRealm } from './config'
import type { Diagnosis, DiagnosisStep, EventItem } from './types'

/** TT.MM.JJJJ aus ISO-Datum/Zeitstempel. */
function deDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** TT.MM., HH:MM Uhr aus ISO-Zeitstempel. */
function deDateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return `${date}, ${time} Uhr`
}

export async function runCustomerCheck(email: string): Promise<Diagnosis> {
  const kcUser = await findUserByEmail(email)

  // Schritt 1 — Keycloak
  const keycloak: DiagnosisStep = kcUser
    ? {
        state: 'ok',
        label: 'Konto vorhanden',
        detail:
          `Kundennr. ${kcUser.kundennummer ?? '—'}` +
          (kcUser.createdAt ? ` · angelegt am ${deDate(kcUser.createdAt)}` : ''),
      }
    : {
        state: 'no',
        label: 'Nicht vorhanden',
        detail: `Kein Konto im Realm ${keycloakRealm()}`,
      }

  // Letzte Ereignisse — bis zu 10, neueste zuerst
  const raw = await getRecentUserEvents(email, kcUser?.id, 10)
  const events: EventItem[] = raw
    .slice()
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 10)
    .map((e) => ({
      time: deDateTime(e.time),
      kind: e.type === 'LOGIN' ? 'ok' : 'no',
      label: e.type === 'LOGIN' ? 'Erfolgreicher Login' : e.error ?? 'Login-Fehler',
      clientId: e.clientId,
    }))

  // Verdikt (zweistufig, ohne Aboonline)
  const verdict: Diagnosis['verdict'] = kcUser
    ? {
        kind: 'ok',
        text:
          'Ein Konto ist in Keycloak vorhanden. Die Anmeldung erfolgt mit der E-Mail-Adresse und dem ' +
          'bisherigen Passwort. Bei Problemen hilft die Passwort-vergessen-Strecke in der App.',
      }
    : {
        kind: 'warn',
        text:
          'Kein Konto in Keycloak. Die Anmeldung in der App mit E-Mail und Aboonline-Passwort legt das ' +
          'Konto beim ersten Login automatisch an. Schlägt die Anmeldung fehl, besteht ' +
          'möglicherweise kein Abo-Konto (Schreibweise der E-Mail prüfen oder an den Abo-Service verweisen).',
      }

  return { keycloak, events, verdict }
}
