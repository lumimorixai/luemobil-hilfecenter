import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "patris_entitlements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"entitlement_id" varchar NOT NULL,
  	"valid_from" timestamp(3) with time zone,
  	"valid_until" timestamp(3) with time zone,
  	"product_number" varchar,
  	"product_name" varchar,
  	"customer_number" varchar,
  	"email" varchar,
  	"first_name" varchar,
  	"last_name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  CREATE TABLE "kundencheck_hinweise" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"aktiv_mit_konto_titel" varchar DEFAULT 'Ticket gültig',
  	"aktiv_mit_konto_text" varchar DEFAULT 'Für den Kunden ist das Ticket „{produkt}“ vom {von} bis {bis} vorgesehen, ein Konto ist vorhanden. Die Anmeldung in der App erfolgt mit der E-Mail-Adresse und dem bisherigen Passwort. Bei Anmeldeproblemen hilft die Passwort-vergessen-Strecke in der App.',
  	"aktiv_ohne_kauf_titel" varchar DEFAULT 'Ticket vorgesehen – in der App nicht ausgeliefert',
  	"aktiv_ohne_kauf_text" varchar DEFAULT 'Für den Kunden ist das Ticket „{produkt}“ vom {von} bis {bis} vorgesehen und ein Konto ist vorhanden, in der App wurde zuletzt aber kein Ticket ausgeliefert. Bitte den Kunden bitten, die App zu öffnen und sich anzumelden. Erscheint das Ticket weiterhin nicht, den Fall an den Second-Level-Support geben.',
  	"aktiv_ohne_konto_titel" varchar DEFAULT 'Ticket gültig – Konto fehlt noch',
  	"aktiv_ohne_konto_text" varchar DEFAULT 'Für den Kunden ist das Ticket „{produkt}“ vom {von} bis {bis} vorgesehen, es gibt aber noch kein Konto. Bitte den Kunden bitten, sich in der App mit E-Mail-Adresse und Aboonline-Passwort anzumelden – das Konto wird dabei automatisch angelegt.',
  	"zukuenftig_titel" varchar DEFAULT 'Ticket noch nicht gültig',
  	"zukuenftig_text" varchar DEFAULT 'Das Ticket „{produkt}“ ist erst ab dem {von} gültig und wird bis dahin in der App noch nicht angezeigt.',
  	"abgelaufen_titel" varchar DEFAULT 'Ticket abgelaufen',
  	"abgelaufen_text" varchar DEFAULT 'Das letzte Ticket „{produkt}“ war bis zum {bis} gültig. Aktuell ist für den Kunden kein gültiges Ticket vorgesehen. Bei Rückfragen zum Abo bitte an den Abo-Service verweisen.',
  	"kein_ticket_titel" varchar DEFAULT 'Kein Ticket vorgesehen',
  	"kein_ticket_text" varchar DEFAULT 'Laut Patris ist für diese E-Mail-Adresse kein Ticket vorgesehen. Bitte die Schreibweise der E-Mail-Adresse prüfen und bei Bedarf an den Abo-Service verweisen.',
  	"app_kauf_titel" varchar DEFAULT 'Ticket in der App gekauft',
  	"app_kauf_text" varchar DEFAULT 'Der Kunde hat am {kaufdatum} in der App das Ticket „{kaufprodukt}“ gekauft (Bestellnummer {bestellnummer}), es wurde erfolgreich ausgeliefert. Ein Abo-Ticket laut Patris ist nicht vorgesehen.',
  	"keine_daten_titel" varchar DEFAULT 'Ticketdaten nicht verfügbar',
  	"keine_daten_text" varchar DEFAULT 'Es liegen noch keine Patris-Daten vor. Die Ticketprüfung ist erst nach dem Upload im Migrations-Cockpit möglich.',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  CREATE TABLE "patris_import" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"imported_at" timestamp(3) with time zone,
  	"file_name" varchar,
  	"imported_by" varchar,
  	"row_count" numeric,
  	"skipped_rows" numeric,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "patris_entitlements_id" integer;
  CREATE INDEX "patris_entitlements_entitlement_id_idx" ON "patris_entitlements" USING btree ("entitlement_id");
  CREATE INDEX "patris_entitlements_customer_number_idx" ON "patris_entitlements" USING btree ("customer_number");
  CREATE INDEX "patris_entitlements_email_idx" ON "patris_entitlements" USING btree ("email");
  CREATE INDEX "patris_entitlements_updated_at_idx" ON "patris_entitlements" USING btree ("updated_at");
  CREATE INDEX "patris_entitlements_created_at_idx" ON "patris_entitlements" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_patris_entitlements_fk" FOREIGN KEY ("patris_entitlements_id") REFERENCES "public"."patris_entitlements"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_patris_entitlements_id_idx" ON "payload_locked_documents_rels" USING btree ("patris_entitlements_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_patris_entitlements_fk";
  DROP INDEX "payload_locked_documents_rels_patris_entitlements_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "patris_entitlements_id";
  DROP TABLE "patris_entitlements" CASCADE;
  DROP TABLE "kundencheck_hinweise" CASCADE;
  DROP TABLE "patris_import" CASCADE;`)
}
