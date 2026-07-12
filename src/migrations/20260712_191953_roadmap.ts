import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_roadmap_items_status" AS ENUM('geplant', 'in Prüfung', 'in Vorbereitung');
  CREATE TABLE "roadmap_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"status" "enum_roadmap_items_status" DEFAULT 'geplant' NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "roadmap" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" numeric DEFAULT 0,
  	"kicker" varchar,
  	"heading" varchar NOT NULL,
  	"intro" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "roadmap_id" integer;
  ALTER TABLE "roadmap_items" ADD CONSTRAINT "roadmap_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."roadmap"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "roadmap_items_order_idx" ON "roadmap_items" USING btree ("_order");
  CREATE INDEX "roadmap_items_parent_id_idx" ON "roadmap_items" USING btree ("_parent_id");
  CREATE INDEX "roadmap_updated_at_idx" ON "roadmap" USING btree ("updated_at");
  CREATE INDEX "roadmap_created_at_idx" ON "roadmap" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_roadmap_fk" FOREIGN KEY ("roadmap_id") REFERENCES "public"."roadmap"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_roadmap_id_idx" ON "payload_locked_documents_rels" USING btree ("roadmap_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "roadmap_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "roadmap" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "roadmap_items" CASCADE;
  DROP TABLE "roadmap" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_roadmap_fk";
  
  DROP INDEX "payload_locked_documents_rels_roadmap_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "roadmap_id";
  DROP TYPE "public"."enum_roadmap_items_status";`)
}
