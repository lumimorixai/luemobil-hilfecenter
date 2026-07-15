import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "known_bugs" ADD COLUMN "jira_key" varchar;
  ALTER TABLE "known_bugs" ADD COLUMN "jira_url" varchar;
  CREATE INDEX "known_bugs_jira_key_idx" ON "known_bugs" USING btree ("jira_key");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "known_bugs_jira_key_idx";
  ALTER TABLE "known_bugs" DROP COLUMN "jira_key";
  ALTER TABLE "known_bugs" DROP COLUMN "jira_url";`)
}
