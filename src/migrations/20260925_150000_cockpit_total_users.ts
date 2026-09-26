import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Kontenbestand je Tag. Bisher wurde die Gesamtzahl der Konten bei jedem
 * Seitenaufruf live aus Keycloak geholt; jetzt schreibt sie der Minuten-Job in
 * die Tagesreihe. Ohne Vorgabewert, weil „noch nicht erhoben" etwas anderes ist
 * als „null Konten" — die Vergangenheit füllt `pnpm job:cockpit backfill`.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cockpit_daily" ADD COLUMN "total_users" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cockpit_daily" DROP COLUMN "total_users";`)
}
