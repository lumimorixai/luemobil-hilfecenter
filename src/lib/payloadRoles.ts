/**
 * Rollen der Payload-Benutzer (CMS-Anmeldung unter /admin).
 *
 * - `admin`      — darf alles, auch Kundendaten (Patris-Tickets) lesen
 * - `redaktion`  — pflegt Inhalte und bearbeitet Meldungen, sieht KEINE Kundendaten
 *
 * Bestandskonten ohne gesetzte Rolle gelten als `admin`: Beim Einführen der
 * Rollen gab es nur Administratoren, und niemand soll sich aussperren. Nach der
 * Vergabe der Rollen an alle Konten kann dieser Sonderfall entfallen.
 *
 * Nicht zu verwechseln mit den Keycloak-Rollen für Kundencheck und Cockpit
 * (src/lib/auth/guard.ts) — das sind getrennte Anmeldungen.
 */
import type { Access, FieldAccess } from 'payload'

export type PayloadRolle = 'admin' | 'redaktion'

type MaybeUser = { role?: PayloadRolle | null } | null | undefined

export function istAdmin(user: MaybeUser): boolean {
  if (!user) return false
  return user.role !== 'redaktion'
}

/** Lesen nur für Administratoren (z. B. Kundendaten aus dem Patris-Import). */
export const nurAdmin: Access = ({ req }) => istAdmin(req.user as MaybeUser)

/** Feld-Zugriff: nur Administratoren dürfen Rollen vergeben. */
export const nurAdminFeld: FieldAccess = ({ req }) => istAdmin(req.user as MaybeUser)
