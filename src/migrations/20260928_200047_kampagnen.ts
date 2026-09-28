import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_kampagnen_ergebnisse_wirkung" AS ENUM('abschluss', 'wiedervorlage', 'erneut', 'entfaellt', 'sperren');
  CREATE TYPE "public"."enum_kampagnen_kanal" AS ENUM('telefon', 'email', 'brief', 'sonstiges');
  CREATE TYPE "public"."enum_kampagnen_status" AS ENUM('entwurf', 'aktiv', 'pausiert', 'beendet');
  CREATE TYPE "public"."enum_kampagnen_regel_verknuepfung" AS ENUM('und', 'oder');
  CREATE TYPE "public"."enum_kampagnen_quelle" AS ENUM('regel', 'csv', 'beides');
  CREATE TYPE "public"."enum_kampagnen_faelle_quelle" AS ENUM('regel', 'csv');
  CREATE TYPE "public"."enum_kampagnen_faelle_status" AS ENUM('offen', 'in_arbeit', 'erledigt', 'entfaellt');
  CREATE TYPE "public"."enum_kampagnen_faelle_entfallen_grund" AS ENUM('konto_vorhanden', 'kein_kontakt', 'widerspruch', 'max_versuche', 'dublette');
  CREATE TYPE "public"."enum_kampagnen_kontakte_kanal" AS ENUM('telefon', 'email', 'notiz');
  CREATE TYPE "public"."enum_kampagnen_sperrliste_art" AS ENUM('email', 'telefon');
  CREATE TYPE "public"."enum_kampagnen_sperrliste_grund" AS ENUM('widerspruch', 'falsche_nummer', 'verstorben', 'sonstiges');
  CREATE TABLE "kampagnen_regeln" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"aktiv" boolean DEFAULT true,
  	"feld" varchar NOT NULL,
  	"operator" varchar DEFAULT 'ist' NOT NULL,
  	"wert" varchar
  );
  
  CREATE TABLE "kampagnen_ergebnisse" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"wirkung" "enum_kampagnen_ergebnisse_wirkung" DEFAULT 'abschluss' NOT NULL,
  	"standard_wiedervorlage_tage" numeric,
  	"notiz_pflicht" boolean
  );
  
  CREATE TABLE "kampagnen" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"kennung" varchar NOT NULL,
  	"beschreibung" varchar,
  	"gespraechsleitfaden" varchar,
  	"kanal" "enum_kampagnen_kanal" DEFAULT 'telefon' NOT NULL,
  	"status" "enum_kampagnen_status" DEFAULT 'entwurf' NOT NULL,
  	"rechtsgrundlage" varchar,
  	"herkunft" varchar,
  	"loeschen_nach_tagen" numeric DEFAULT 90 NOT NULL,
  	"max_versuche" numeric DEFAULT 3 NOT NULL,
  	"sperre_minuten" numeric DEFAULT 15 NOT NULL,
  	"regel_verknuepfung" "enum_kampagnen_regel_verknuepfung" DEFAULT 'und',
  	"quelle" "enum_kampagnen_quelle",
  	"erzeugt_am" timestamp(3) with time zone,
  	"erzeugt_von" varchar,
  	"faelle_gesamt" numeric,
  	"faelle_offen" numeric,
  	"faelle_erledigt" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "kampagnen_faelle" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kampagne_id" integer NOT NULL,
  	"schluessel" varchar NOT NULL,
  	"email" varchar,
  	"telefon" varchar,
  	"telefon_roh" varchar,
  	"vorname" varchar,
  	"nachname" varchar,
  	"kundennummer" varchar,
  	"entitlement_id" varchar,
  	"produktnummer" varchar,
  	"geburtsdatum" timestamp(3) with time zone,
  	"merkmale" jsonb,
  	"quelle" "enum_kampagnen_faelle_quelle",
  	"status" "enum_kampagnen_faelle_status" DEFAULT 'offen' NOT NULL,
  	"ergebnis" varchar,
  	"entfallen_grund" "enum_kampagnen_faelle_entfallen_grund",
  	"versuche" numeric DEFAULT 0 NOT NULL,
  	"letzter_versuch_am" timestamp(3) with time zone,
  	"wiedervorlage_am" timestamp(3) with time zone,
  	"wiedervorlage_fuer" varchar,
  	"gesperrt_von" varchar,
  	"gesperrt_bis" timestamp(3) with time zone,
  	"konto_vorhanden" boolean,
  	"konto_geprueft_am" timestamp(3) with time zone,
  	"abschluss_am" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "kampagnen_kontakte" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"fall_id" integer NOT NULL,
  	"kampagne_id" integer,
  	"zeitpunkt" timestamp(3) with time zone NOT NULL,
  	"bearbeiter" varchar NOT NULL,
  	"bearbeiter_name" varchar,
  	"kanal" "enum_kampagnen_kontakte_kanal",
  	"ergebnis_code" varchar NOT NULL,
  	"notiz" varchar,
  	"dauer_sekunden" numeric,
  	"naechste_wiedervorlage" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "kampagnen_sperrliste" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"schluessel" varchar NOT NULL,
  	"art" "enum_kampagnen_sperrliste_art",
  	"grund" "enum_kampagnen_sperrliste_grund" DEFAULT 'widerspruch' NOT NULL,
  	"gueltig_ab" timestamp(3) with time zone NOT NULL,
  	"angelegt_von" varchar,
  	"notiz" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "kampagnen_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "kampagnen_faelle_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "kampagnen_kontakte_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "kampagnen_sperrliste_id" integer;
  ALTER TABLE "kampagnen_regeln" ADD CONSTRAINT "kampagnen_regeln_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."kampagnen"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "kampagnen_ergebnisse" ADD CONSTRAINT "kampagnen_ergebnisse_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."kampagnen"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "kampagnen_faelle" ADD CONSTRAINT "kampagnen_faelle_kampagne_id_kampagnen_id_fk" FOREIGN KEY ("kampagne_id") REFERENCES "public"."kampagnen"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "kampagnen_kontakte" ADD CONSTRAINT "kampagnen_kontakte_fall_id_kampagnen_faelle_id_fk" FOREIGN KEY ("fall_id") REFERENCES "public"."kampagnen_faelle"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "kampagnen_kontakte" ADD CONSTRAINT "kampagnen_kontakte_kampagne_id_kampagnen_id_fk" FOREIGN KEY ("kampagne_id") REFERENCES "public"."kampagnen"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "kampagnen_regeln_order_idx" ON "kampagnen_regeln" USING btree ("_order");
  CREATE INDEX "kampagnen_regeln_parent_id_idx" ON "kampagnen_regeln" USING btree ("_parent_id");
  CREATE INDEX "kampagnen_ergebnisse_order_idx" ON "kampagnen_ergebnisse" USING btree ("_order");
  CREATE INDEX "kampagnen_ergebnisse_parent_id_idx" ON "kampagnen_ergebnisse" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "kampagnen_kennung_idx" ON "kampagnen" USING btree ("kennung");
  CREATE INDEX "kampagnen_status_idx" ON "kampagnen" USING btree ("status");
  CREATE INDEX "kampagnen_updated_at_idx" ON "kampagnen" USING btree ("updated_at");
  CREATE INDEX "kampagnen_created_at_idx" ON "kampagnen" USING btree ("created_at");
  CREATE INDEX "kampagnen_faelle_kampagne_idx" ON "kampagnen_faelle" USING btree ("kampagne_id");
  CREATE INDEX "kampagnen_faelle_schluessel_idx" ON "kampagnen_faelle" USING btree ("schluessel");
  CREATE INDEX "kampagnen_faelle_email_idx" ON "kampagnen_faelle" USING btree ("email");
  CREATE INDEX "kampagnen_faelle_kundennummer_idx" ON "kampagnen_faelle" USING btree ("kundennummer");
  CREATE INDEX "kampagnen_faelle_status_idx" ON "kampagnen_faelle" USING btree ("status");
  CREATE INDEX "kampagnen_faelle_ergebnis_idx" ON "kampagnen_faelle" USING btree ("ergebnis");
  CREATE INDEX "kampagnen_faelle_versuche_idx" ON "kampagnen_faelle" USING btree ("versuche");
  CREATE INDEX "kampagnen_faelle_letzter_versuch_am_idx" ON "kampagnen_faelle" USING btree ("letzter_versuch_am");
  CREATE INDEX "kampagnen_faelle_wiedervorlage_am_idx" ON "kampagnen_faelle" USING btree ("wiedervorlage_am");
  CREATE INDEX "kampagnen_faelle_gesperrt_bis_idx" ON "kampagnen_faelle" USING btree ("gesperrt_bis");
  CREATE INDEX "kampagnen_faelle_konto_geprueft_am_idx" ON "kampagnen_faelle" USING btree ("konto_geprueft_am");
  CREATE INDEX "kampagnen_faelle_updated_at_idx" ON "kampagnen_faelle" USING btree ("updated_at");
  CREATE INDEX "kampagnen_faelle_created_at_idx" ON "kampagnen_faelle" USING btree ("created_at");
  CREATE INDEX "kampagnen_kontakte_fall_idx" ON "kampagnen_kontakte" USING btree ("fall_id");
  CREATE INDEX "kampagnen_kontakte_kampagne_idx" ON "kampagnen_kontakte" USING btree ("kampagne_id");
  CREATE INDEX "kampagnen_kontakte_zeitpunkt_idx" ON "kampagnen_kontakte" USING btree ("zeitpunkt");
  CREATE INDEX "kampagnen_kontakte_bearbeiter_idx" ON "kampagnen_kontakte" USING btree ("bearbeiter");
  CREATE INDEX "kampagnen_kontakte_ergebnis_code_idx" ON "kampagnen_kontakte" USING btree ("ergebnis_code");
  CREATE INDEX "kampagnen_kontakte_updated_at_idx" ON "kampagnen_kontakte" USING btree ("updated_at");
  CREATE INDEX "kampagnen_kontakte_created_at_idx" ON "kampagnen_kontakte" USING btree ("created_at");
  CREATE UNIQUE INDEX "kampagnen_sperrliste_schluessel_idx" ON "kampagnen_sperrliste" USING btree ("schluessel");
  CREATE INDEX "kampagnen_sperrliste_updated_at_idx" ON "kampagnen_sperrliste" USING btree ("updated_at");
  CREATE INDEX "kampagnen_sperrliste_created_at_idx" ON "kampagnen_sperrliste" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_kampagnen_fk" FOREIGN KEY ("kampagnen_id") REFERENCES "public"."kampagnen"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_kampagnen_faelle_fk" FOREIGN KEY ("kampagnen_faelle_id") REFERENCES "public"."kampagnen_faelle"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_kampagnen_kontakte_fk" FOREIGN KEY ("kampagnen_kontakte_id") REFERENCES "public"."kampagnen_kontakte"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_kampagnen_sperrliste_fk" FOREIGN KEY ("kampagnen_sperrliste_id") REFERENCES "public"."kampagnen_sperrliste"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_kampagnen_id_idx" ON "payload_locked_documents_rels" USING btree ("kampagnen_id");
  CREATE INDEX "payload_locked_documents_rels_kampagnen_faelle_id_idx" ON "payload_locked_documents_rels" USING btree ("kampagnen_faelle_id");
  CREATE INDEX "payload_locked_documents_rels_kampagnen_kontakte_id_idx" ON "payload_locked_documents_rels" USING btree ("kampagnen_kontakte_id");
  CREATE INDEX "payload_locked_documents_rels_kampagnen_sperrliste_id_idx" ON "payload_locked_documents_rels" USING btree ("kampagnen_sperrliste_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "kampagnen_regeln" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "kampagnen_ergebnisse" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "kampagnen" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "kampagnen_faelle" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "kampagnen_kontakte" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "kampagnen_sperrliste" DISABLE ROW LEVEL SECURITY;
  
  
  
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_kampagnen_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_kampagnen_faelle_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_kampagnen_kontakte_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_kampagnen_sperrliste_fk";
  DROP INDEX "payload_locked_documents_rels_kampagnen_id_idx";
  DROP INDEX "payload_locked_documents_rels_kampagnen_faelle_id_idx";
  DROP INDEX "payload_locked_documents_rels_kampagnen_kontakte_id_idx";
  DROP INDEX "payload_locked_documents_rels_kampagnen_sperrliste_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "kampagnen_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "kampagnen_faelle_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "kampagnen_kontakte_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "kampagnen_sperrliste_id";
  DROP TABLE "kampagnen_regeln" CASCADE;
  DROP TABLE "kampagnen_ergebnisse" CASCADE;
  DROP TABLE "kampagnen" CASCADE;
  DROP TABLE "kampagnen_faelle" CASCADE;
  DROP TABLE "kampagnen_kontakte" CASCADE;
  DROP TABLE "kampagnen_sperrliste" CASCADE;
  DROP TYPE "public"."enum_kampagnen_ergebnisse_wirkung";
  DROP TYPE "public"."enum_kampagnen_kanal";
  DROP TYPE "public"."enum_kampagnen_status";
  DROP TYPE "public"."enum_kampagnen_regel_verknuepfung";
  DROP TYPE "public"."enum_kampagnen_quelle";
  DROP TYPE "public"."enum_kampagnen_faelle_quelle";
  DROP TYPE "public"."enum_kampagnen_faelle_status";
  DROP TYPE "public"."enum_kampagnen_faelle_entfallen_grund";
  DROP TYPE "public"."enum_kampagnen_kontakte_kanal";
  DROP TYPE "public"."enum_kampagnen_sperrliste_art";
  DROP TYPE "public"."enum_kampagnen_sperrliste_grund";`)
}
