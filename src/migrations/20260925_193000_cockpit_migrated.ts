import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Trennt „alle neu angelegten Konten" von „aus dem Altsystem übernommen".
 *
 * Bisher enthielt new_users nur die föderierten Konten, wurde aber als „neue
 * Nutzer" angezeigt und zur Herleitung des Bestands verwendet — beides falsch:
 * An einem Beispieltag waren es 10 statt 114 Anlagen. Künftig zählt new_users
 * alle Anlagen (createdTimestamp), migrated_users davon die übernommenen.
 *
 * Die Altwerte lassen sich nicht automatisch umdeuten; sie werden beim nächsten
 * `pnpm job:cockpit backfill <tage>` überschrieben.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cockpit_daily" ADD COLUMN "migrated_users" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cockpit_daily" DROP COLUMN "migrated_users";`)
}
