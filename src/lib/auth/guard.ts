/**
 * Zugriffsschutz für den Cockpit-Bereich. Liest die Session aus dem Cookie
 * und prüft die Support-Rolle. Wird von der Cockpit-Seite (Redirect) und von
 * allen /api/cockpit-Routen (403) verwendet.
 *
 * Nur im Node-Runtime (nutzt next/headers cookies()).
 */
import { cookies } from 'next/headers'
import { SESSION_COOKIE, decodeSession, hasRole, type CockpitSession } from './session'

/** Name der Keycloak-Realm-Rolle, die Cockpit-Zugriff gewährt. */
export function supportRole(): string {
  return process.env.COCKPIT_SUPPORT_ROLE || 'support'
}

export async function getCockpitSession(): Promise<CockpitSession | null> {
  const store = await cookies()
  return decodeSession(store.get(SESSION_COOKIE)?.value)
}

export function isSupport(session: CockpitSession | null): boolean {
  return hasRole(session, supportRole())
}

/** Bequemer Guard für Route-Handler: Session mit Support-Rolle oder null. */
export async function requireSupport(): Promise<CockpitSession | null> {
  const session = await getCockpitSession()
  return isSupport(session) ? session : null
}
