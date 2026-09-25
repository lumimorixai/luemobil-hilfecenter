import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'redaktion');
  ALTER TABLE "users" ADD COLUMN "role" "enum_users_role" DEFAULT 'redaktion';

  -- Bestandskonten waren bisher uneingeschränkt und bleiben Administrator.
  -- Neue Konten bekommen über den Standardwert die Rolle „redaktion".
  UPDATE "users" SET "role" = 'admin';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN "role";
  DROP TYPE "public"."enum_users_role";`)
}
