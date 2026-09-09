import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "health_checks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"checked_at" timestamp(3) with time zone NOT NULL,
  	"status" jsonb,
  	"fail_counts" jsonb,
  	"alerted_down" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "health_checks_id" integer;
  CREATE INDEX "health_checks_checked_at_idx" ON "health_checks" USING btree ("checked_at");
  CREATE INDEX "health_checks_updated_at_idx" ON "health_checks" USING btree ("updated_at");
  CREATE INDEX "health_checks_created_at_idx" ON "health_checks" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_health_checks_fk" FOREIGN KEY ("health_checks_id") REFERENCES "public"."health_checks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_health_checks_id_idx" ON "payload_locked_documents_rels" USING btree ("health_checks_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "health_checks" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "health_checks" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_health_checks_fk";

  DROP INDEX "payload_locked_documents_rels_health_checks_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "health_checks_id";`)
}
