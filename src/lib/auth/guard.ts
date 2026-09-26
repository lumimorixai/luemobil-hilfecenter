/**
 * Zugriffsschutz für die internen Bereiche. Liest die Session aus dem Cookie
 * und prüft die Keycloak-Realm-Rollen. Zwei getrennte Berechtigungen:
 *
 * - Kundencheck      → Rolle COCKPIT_ROLE_KUNDENCHECK (Standard „kundencheck")
 * - Migrations-Cockpit → Rolle COCKPIT_ROLE_MIGRATION (Standard „cockpit")
 *
 * Die bisherige Rolle COCKPIT_SUPPORT_ROLE (Standard „support") schaltet
 * weiterhin BEIDES frei — so verliert beim Umstieg niemand den Zugriff, auch
 * bevor die neuen Rollen in Keycloak angelegt sind.
 *
 * Wird von den Seiten (Redirect/Hinweis) und allen /api/cockpit-Routen (403)
 * verwendet. Nur im Node-Runtime (nutzt next/headers cookies()).
 */
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, decodeSession, hasRole, type CockpitSession } from './session'

/** Rolle, die beide Bereiche freischaltet (bisherige Support-Rolle). */
export function supportRole(): string {
  return process.env.COCKPIT_SUPPORT_ROLE || 'support'
}

/** Rolle nur für den Kundencheck. */
export function kundencheckRole(): string {
  return process.env.COCKPIT_ROLE_KUNDENCHECK || 'kundencheck'
}

/** Rolle nur für das Migrations-Cockpit. */
export function cockpitRole(): string {
  return process.env.COCKPIT_ROLE_MIGRATION || 'cockpit'
}

export async function getCockpitSession(): Promise<CockpitSession | null> {
  const store = await cookies()
  return decodeSession(store.get(SESSION_COOKIE)?.value)
}

export function canKundencheck(session: CockpitSession | null): boolean {
  return hasRole(session, kundencheckRole()) || hasRole(session, supportRole())
}

export function canCockpit(session: CockpitSession | null): boolean {
  return hasRole(session, cockpitRole()) || hasRole(session, supportRole())
}

/** Mindestens einer der internen Bereiche ist erlaubt. */
export function isInternal(session: CockpitSession | null): boolean {
  return canKundencheck(session) || canCockpit(session)
}

/**
 * Guard für Cockpit-SEITEN (nicht Route-Handler): leitet um statt null zu
 * liefern — zum Login, oder in den Bereich, den die Person sehen darf.
 */
export async function seiteCockpit(next: string): Promise<CockpitSession> {
  const session = await getCockpitSession()
  if (!session) redirect(`/api/auth/login?next=${encodeURIComponent(next)}`)
  if (!canCockpit(session)) {
    redirect(canKundencheck(session) ? '/cockpit/kundencheck' : '/cockpit')
  }
  return session
}

/** Wie oben, aber für den Kundencheck (auch ohne Cockpit-Berechtigung). */
export async function seiteKundencheck(next: string): Promise<CockpitSession> {
  const session = await getCockpitSession()
  if (!session) redirect(`/api/auth/login?next=${encodeURIComponent(next)}`)
  if (!canKundencheck(session)) redirect('/cockpit')
  return session
}

/** Guard für Route-Handler des Kundenchecks: Session oder null (→ 403). */
export async function requireKundencheck(): Promise<CockpitSession | null> {
  const session = await getCockpitSession()
  return canKundencheck(session) ? session : null
}

/** Guard für Route-Handler des Migrations-Cockpits: Session oder null (→ 403). */
export async function requireCockpit(): Promise<CockpitSession | null> {
  const session = await getCockpitSession()
  return canCockpit(session) ? session : null
}
