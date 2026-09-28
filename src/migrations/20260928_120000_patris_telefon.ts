import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Telefonnummer und Geburtsdatum im Patris-Bestand — Grundlage der Anruflisten.
 *
 * Beide Spalten waren im September kurzzeitig in der Payload-Konfiguration und
 * wurden wieder entfernt. Der Schema-Snapshot der Folgemigration führt `phone`
 * deshalb bereits, obwohl nie ein ALTER TABLE lief: Ob die Spalte in Produktion
 * existiert, ist von hier aus nicht zu entscheiden. `IF NOT EXISTS` ist deshalb
 * keine Vorsicht, sondern Pflicht — und ein künftiges `migrate:create` würde
 * die Spalte wegen des Snapshots gar nicht mehr vorschlagen.
 *
 * Die Nummer wird ausschließlich für Kampagnen verwendet; der Kundencheck zeigt
 * sie nicht (`toTicketItem` in diagnose.ts baut das Anzeigeobjekt Feld für Feld).
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "patris_entitlements" ADD COLUMN IF NOT EXISTS "phone" varchar;
  ALTER TABLE "patris_entitlements" ADD COLUMN IF NOT EXISTS "birthday" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "patris_entitlements" DROP COLUMN IF EXISTS "birthday";
  ALTER TABLE "patris_entitlements" DROP COLUMN IF EXISTS "phone";`)
}
