import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Verfügbarkeit je Dienst als Tageswert. Die Minuten-Checks (health_checks)
 * wachsen um rund 1.440 Zeilen am Tag und werden künftig nach
 * HEALTH_RETENTION_DAYS (Standard 35) aufgeräumt. Damit die Historie nicht
 * verloren geht, wird sie vorher hierher verdichtet — ein Wert je Dienst und Tag.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cockpit_daily" ADD COLUMN "availability" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cockpit_daily" DROP COLUMN "availability";`)
}
