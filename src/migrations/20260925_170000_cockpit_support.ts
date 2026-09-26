import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Support-Ereignisse und Logins je Client als Tageswerte. Bisher wurden beide
 * bei jedem Seitenaufruf live aus den Keycloak-Events gerechnet — über sieben
 * Tage hinweg, was die Grenze von 5.000 Ereignissen je Abfrage riss und mit dem
 * Verfallen der Events endete. Jetzt schreibt der Minuten-Job sie mit.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cockpit_daily" ADD COLUMN "support" jsonb;
  ALTER TABLE "cockpit_daily" ADD COLUMN "logins_by_client" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cockpit_daily" DROP COLUMN "logins_by_client";
  ALTER TABLE "cockpit_daily" DROP COLUMN "support";`)
}
