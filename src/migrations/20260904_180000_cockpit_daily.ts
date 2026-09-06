import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "cockpit_daily" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"datum" varchar NOT NULL,
  	"logins" numeric DEFAULT 0 NOT NULL,
  	"login_errors" numeric DEFAULT 0 NOT NULL,
  	"new_users" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cockpit_daily_id" integer;
  CREATE UNIQUE INDEX "cockpit_daily_datum_idx" ON "cockpit_daily" USING btree ("datum");
  CREATE INDEX "cockpit_daily_updated_at_idx" ON "cockpit_daily" USING btree ("updated_at");
  CREATE INDEX "cockpit_daily_created_at_idx" ON "cockpit_daily" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cockpit_daily_fk" FOREIGN KEY ("cockpit_daily_id") REFERENCES "public"."cockpit_daily"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_cockpit_daily_id_idx" ON "payload_locked_documents_rels" USING btree ("cockpit_daily_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cockpit_daily" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cockpit_daily" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_cockpit_daily_fk";

  DROP INDEX "payload_locked_documents_rels_cockpit_daily_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cockpit_daily_id";`)
}
