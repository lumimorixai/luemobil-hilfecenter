import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_articles_category" AS ENUM('Verbindungssuche', 'Konto & Personalisierung', 'Fahrplanauskunft', 'Tickets', 'Hilfe & Kontakt');
  CREATE TYPE "public"."enum_manual_chapters_layout" AS ENUM('single', 'row');
  CREATE TYPE "public"."enum_known_bugs_state" AS ENUM('gemeldet', 'offen', 'behoben');
  CREATE TYPE "public"."enum_known_bugs_severity" AS ENUM('hoch', 'mittel', 'niedrig');
  CREATE TYPE "public"."enum_open_questions_items_status" AS ENUM('offen', 'beantwortet');
  CREATE TYPE "public"."enum_bug_reports_status" AS ENUM('neu', 'in-pruefung', 'uebernommen', 'abgelehnt');
  CREATE TYPE "public"."enum_bug_reports_severity" AS ENUM('hoch', 'mittel', 'niedrig');
  CREATE TYPE "public"."enum_question_submissions_status" AS ENUM('neu', 'in-pruefung', 'uebernommen', 'abgelehnt');
  CREATE TABLE "articles_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "articles_step_groups_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "articles_step_groups" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar NOT NULL
  );
  
  CREATE TABLE "articles_tips" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "articles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"category" "enum_articles_category" NOT NULL,
  	"title" varchar NOT NULL,
  	"excerpt" varchar,
  	"meta" varchar,
  	"short" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "articles_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer
  );
  
  CREATE TABLE "faq_groups_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"q" varchar NOT NULL,
  	"a" varchar NOT NULL
  );
  
  CREATE TABLE "faq_groups" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"group" varchar NOT NULL,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "manual_chapters_paras" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "manual_chapters_bullets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "manual_chapters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"order" numeric DEFAULT 0,
  	"num" varchar,
  	"title" varchar NOT NULL,
  	"layout" "enum_manual_chapters_layout" DEFAULT 'single',
  	"reverse" boolean DEFAULT false,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "manual_chapters_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "known_bugs_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "known_bugs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"bug_id" varchar NOT NULL,
  	"state" "enum_known_bugs_state" DEFAULT 'offen' NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"severity" "enum_known_bugs_severity" NOT NULL,
  	"title" varchar NOT NULL,
  	"fundort" varchar,
  	"description" varchar,
  	"expected" varchar,
  	"actual" varchar,
  	"caption" varchar,
  	"no_image_note" varchar,
  	"reverse" boolean DEFAULT false,
  	"builtin" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "known_bugs_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "open_questions_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"qid" varchar NOT NULL,
  	"status" "enum_open_questions_items_status" DEFAULT 'offen' NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar,
  	"note" varchar
  );
  
  CREATE TABLE "open_questions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"group" varchar NOT NULL,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "bug_reports_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "bug_reports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" "enum_bug_reports_status" DEFAULT 'neu' NOT NULL,
  	"severity" "enum_bug_reports_severity" DEFAULT 'mittel' NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"expected" varchar,
  	"actual" varchar,
  	"reporter" varchar,
  	"internal_note" varchar,
  	"converted_to_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "bug_reports_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "question_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" "enum_question_submissions_status" DEFAULT 'neu' NOT NULL,
  	"target_group_id" integer,
  	"question" varchar NOT NULL,
  	"answer" varchar,
  	"reporter" varchar,
  	"contact" varchar,
  	"internal_note" varchar,
  	"converted_to_id" integer,
  	"published_qid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"articles_id" integer,
  	"faq_groups_id" integer,
  	"manual_chapters_id" integer,
  	"known_bugs_id" integer,
  	"open_questions_id" integer,
  	"bug_reports_id" integer,
  	"question_submissions_id" integer,
  	"media_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "articles_steps" ADD CONSTRAINT "articles_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_step_groups_items" ADD CONSTRAINT "articles_step_groups_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles_step_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_step_groups" ADD CONSTRAINT "articles_step_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_tips" ADD CONSTRAINT "articles_tips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articles_rels" ADD CONSTRAINT "articles_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faq_groups_items" ADD CONSTRAINT "faq_groups_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faq_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "manual_chapters_paras" ADD CONSTRAINT "manual_chapters_paras_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."manual_chapters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "manual_chapters_bullets" ADD CONSTRAINT "manual_chapters_bullets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."manual_chapters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "manual_chapters_rels" ADD CONSTRAINT "manual_chapters_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."manual_chapters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "manual_chapters_rels" ADD CONSTRAINT "manual_chapters_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "known_bugs_steps" ADD CONSTRAINT "known_bugs_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."known_bugs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "known_bugs_rels" ADD CONSTRAINT "known_bugs_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."known_bugs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "known_bugs_rels" ADD CONSTRAINT "known_bugs_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "open_questions_items" ADD CONSTRAINT "open_questions_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."open_questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bug_reports_steps" ADD CONSTRAINT "bug_reports_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."bug_reports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_converted_to_id_known_bugs_id_fk" FOREIGN KEY ("converted_to_id") REFERENCES "public"."known_bugs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bug_reports_rels" ADD CONSTRAINT "bug_reports_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."bug_reports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bug_reports_rels" ADD CONSTRAINT "bug_reports_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "question_submissions" ADD CONSTRAINT "question_submissions_target_group_id_open_questions_id_fk" FOREIGN KEY ("target_group_id") REFERENCES "public"."open_questions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "question_submissions" ADD CONSTRAINT "question_submissions_converted_to_id_open_questions_id_fk" FOREIGN KEY ("converted_to_id") REFERENCES "public"."open_questions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_faq_groups_fk" FOREIGN KEY ("faq_groups_id") REFERENCES "public"."faq_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_manual_chapters_fk" FOREIGN KEY ("manual_chapters_id") REFERENCES "public"."manual_chapters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_known_bugs_fk" FOREIGN KEY ("known_bugs_id") REFERENCES "public"."known_bugs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_open_questions_fk" FOREIGN KEY ("open_questions_id") REFERENCES "public"."open_questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_bug_reports_fk" FOREIGN KEY ("bug_reports_id") REFERENCES "public"."bug_reports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_question_submissions_fk" FOREIGN KEY ("question_submissions_id") REFERENCES "public"."question_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "articles_steps_order_idx" ON "articles_steps" USING btree ("_order");
  CREATE INDEX "articles_steps_parent_id_idx" ON "articles_steps" USING btree ("_parent_id");
  CREATE INDEX "articles_step_groups_items_order_idx" ON "articles_step_groups_items" USING btree ("_order");
  CREATE INDEX "articles_step_groups_items_parent_id_idx" ON "articles_step_groups_items" USING btree ("_parent_id");
  CREATE INDEX "articles_step_groups_order_idx" ON "articles_step_groups" USING btree ("_order");
  CREATE INDEX "articles_step_groups_parent_id_idx" ON "articles_step_groups" USING btree ("_parent_id");
  CREATE INDEX "articles_tips_order_idx" ON "articles_tips" USING btree ("_order");
  CREATE INDEX "articles_tips_parent_id_idx" ON "articles_tips" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");
  CREATE INDEX "articles_updated_at_idx" ON "articles" USING btree ("updated_at");
  CREATE INDEX "articles_created_at_idx" ON "articles" USING btree ("created_at");
  CREATE INDEX "articles_rels_order_idx" ON "articles_rels" USING btree ("order");
  CREATE INDEX "articles_rels_parent_idx" ON "articles_rels" USING btree ("parent_id");
  CREATE INDEX "articles_rels_path_idx" ON "articles_rels" USING btree ("path");
  CREATE INDEX "articles_rels_articles_id_idx" ON "articles_rels" USING btree ("articles_id");
  CREATE INDEX "faq_groups_items_order_idx" ON "faq_groups_items" USING btree ("_order");
  CREATE INDEX "faq_groups_items_parent_id_idx" ON "faq_groups_items" USING btree ("_parent_id");
  CREATE INDEX "faq_groups_updated_at_idx" ON "faq_groups" USING btree ("updated_at");
  CREATE INDEX "faq_groups_created_at_idx" ON "faq_groups" USING btree ("created_at");
  CREATE INDEX "manual_chapters_paras_order_idx" ON "manual_chapters_paras" USING btree ("_order");
  CREATE INDEX "manual_chapters_paras_parent_id_idx" ON "manual_chapters_paras" USING btree ("_parent_id");
  CREATE INDEX "manual_chapters_bullets_order_idx" ON "manual_chapters_bullets" USING btree ("_order");
  CREATE INDEX "manual_chapters_bullets_parent_id_idx" ON "manual_chapters_bullets" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "manual_chapters_slug_idx" ON "manual_chapters" USING btree ("slug");
  CREATE INDEX "manual_chapters_updated_at_idx" ON "manual_chapters" USING btree ("updated_at");
  CREATE INDEX "manual_chapters_created_at_idx" ON "manual_chapters" USING btree ("created_at");
  CREATE INDEX "manual_chapters_rels_order_idx" ON "manual_chapters_rels" USING btree ("order");
  CREATE INDEX "manual_chapters_rels_parent_idx" ON "manual_chapters_rels" USING btree ("parent_id");
  CREATE INDEX "manual_chapters_rels_path_idx" ON "manual_chapters_rels" USING btree ("path");
  CREATE INDEX "manual_chapters_rels_media_id_idx" ON "manual_chapters_rels" USING btree ("media_id");
  CREATE INDEX "known_bugs_steps_order_idx" ON "known_bugs_steps" USING btree ("_order");
  CREATE INDEX "known_bugs_steps_parent_id_idx" ON "known_bugs_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "known_bugs_bug_id_idx" ON "known_bugs" USING btree ("bug_id");
  CREATE INDEX "known_bugs_hidden_idx" ON "known_bugs" USING btree ("hidden");
  CREATE INDEX "known_bugs_updated_at_idx" ON "known_bugs" USING btree ("updated_at");
  CREATE INDEX "known_bugs_created_at_idx" ON "known_bugs" USING btree ("created_at");
  CREATE INDEX "known_bugs_rels_order_idx" ON "known_bugs_rels" USING btree ("order");
  CREATE INDEX "known_bugs_rels_parent_idx" ON "known_bugs_rels" USING btree ("parent_id");
  CREATE INDEX "known_bugs_rels_path_idx" ON "known_bugs_rels" USING btree ("path");
  CREATE INDEX "known_bugs_rels_media_id_idx" ON "known_bugs_rels" USING btree ("media_id");
  CREATE INDEX "open_questions_items_order_idx" ON "open_questions_items" USING btree ("_order");
  CREATE INDEX "open_questions_items_parent_id_idx" ON "open_questions_items" USING btree ("_parent_id");
  CREATE INDEX "open_questions_updated_at_idx" ON "open_questions" USING btree ("updated_at");
  CREATE INDEX "open_questions_created_at_idx" ON "open_questions" USING btree ("created_at");
  CREATE INDEX "bug_reports_steps_order_idx" ON "bug_reports_steps" USING btree ("_order");
  CREATE INDEX "bug_reports_steps_parent_id_idx" ON "bug_reports_steps" USING btree ("_parent_id");
  CREATE INDEX "bug_reports_converted_to_idx" ON "bug_reports" USING btree ("converted_to_id");
  CREATE INDEX "bug_reports_updated_at_idx" ON "bug_reports" USING btree ("updated_at");
  CREATE INDEX "bug_reports_created_at_idx" ON "bug_reports" USING btree ("created_at");
  CREATE INDEX "bug_reports_rels_order_idx" ON "bug_reports_rels" USING btree ("order");
  CREATE INDEX "bug_reports_rels_parent_idx" ON "bug_reports_rels" USING btree ("parent_id");
  CREATE INDEX "bug_reports_rels_path_idx" ON "bug_reports_rels" USING btree ("path");
  CREATE INDEX "bug_reports_rels_media_id_idx" ON "bug_reports_rels" USING btree ("media_id");
  CREATE INDEX "question_submissions_target_group_idx" ON "question_submissions" USING btree ("target_group_id");
  CREATE INDEX "question_submissions_converted_to_idx" ON "question_submissions" USING btree ("converted_to_id");
  CREATE INDEX "question_submissions_updated_at_idx" ON "question_submissions" USING btree ("updated_at");
  CREATE INDEX "question_submissions_created_at_idx" ON "question_submissions" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_articles_id_idx" ON "payload_locked_documents_rels" USING btree ("articles_id");
  CREATE INDEX "payload_locked_documents_rels_faq_groups_id_idx" ON "payload_locked_documents_rels" USING btree ("faq_groups_id");
  CREATE INDEX "payload_locked_documents_rels_manual_chapters_id_idx" ON "payload_locked_documents_rels" USING btree ("manual_chapters_id");
  CREATE INDEX "payload_locked_documents_rels_known_bugs_id_idx" ON "payload_locked_documents_rels" USING btree ("known_bugs_id");
  CREATE INDEX "payload_locked_documents_rels_open_questions_id_idx" ON "payload_locked_documents_rels" USING btree ("open_questions_id");
  CREATE INDEX "payload_locked_documents_rels_bug_reports_id_idx" ON "payload_locked_documents_rels" USING btree ("bug_reports_id");
  CREATE INDEX "payload_locked_documents_rels_question_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("question_submissions_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "articles_steps" CASCADE;
  DROP TABLE "articles_step_groups_items" CASCADE;
  DROP TABLE "articles_step_groups" CASCADE;
  DROP TABLE "articles_tips" CASCADE;
  DROP TABLE "articles" CASCADE;
  DROP TABLE "articles_rels" CASCADE;
  DROP TABLE "faq_groups_items" CASCADE;
  DROP TABLE "faq_groups" CASCADE;
  DROP TABLE "manual_chapters_paras" CASCADE;
  DROP TABLE "manual_chapters_bullets" CASCADE;
  DROP TABLE "manual_chapters" CASCADE;
  DROP TABLE "manual_chapters_rels" CASCADE;
  DROP TABLE "known_bugs_steps" CASCADE;
  DROP TABLE "known_bugs" CASCADE;
  DROP TABLE "known_bugs_rels" CASCADE;
  DROP TABLE "open_questions_items" CASCADE;
  DROP TABLE "open_questions" CASCADE;
  DROP TABLE "bug_reports_steps" CASCADE;
  DROP TABLE "bug_reports" CASCADE;
  DROP TABLE "bug_reports_rels" CASCADE;
  DROP TABLE "question_submissions" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_articles_category";
  DROP TYPE "public"."enum_manual_chapters_layout";
  DROP TYPE "public"."enum_known_bugs_state";
  DROP TYPE "public"."enum_known_bugs_severity";
  DROP TYPE "public"."enum_open_questions_items_status";
  DROP TYPE "public"."enum_bug_reports_status";
  DROP TYPE "public"."enum_bug_reports_severity";
  DROP TYPE "public"."enum_question_submissions_status";`)
}
