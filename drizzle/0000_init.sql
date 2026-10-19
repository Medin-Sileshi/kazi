CREATE TABLE IF NOT EXISTS "channels" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "username" varchar(255) NOT NULL,
  "title" varchar(512),
  "market" varchar(32) DEFAULT 'both' NOT NULL,
  "language_hint" varchar(64),
  "active" boolean DEFAULT true NOT NULL,
  "last_message_id" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "channels_username_unique" UNIQUE("username")
);

CREATE TABLE IF NOT EXISTS "raw_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "channel_id" uuid NOT NULL,
  "tg_message_id" integer NOT NULL,
  "text" text DEFAULT '' NOT NULL,
  "posted_at" timestamp NOT NULL,
  "payload" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "channel_id" uuid NOT NULL,
  "raw_post_id" uuid,
  "tg_message_id" integer NOT NULL,
  "title" varchar(512) NOT NULL,
  "company" varchar(512),
  "location" varchar(512),
  "description" text DEFAULT '' NOT NULL,
  "categories" text[] DEFAULT '{}' NOT NULL,
  "skills" text[] DEFAULT '{}' NOT NULL,
  "tags" text[] DEFAULT '{}' NOT NULL,
  "remote" boolean DEFAULT false NOT NULL,
  "employment_type" varchar(64),
  "salary_text" varchar(256),
  "apply_url" text,
  "source_url" text NOT NULL,
  "posted_at" timestamp NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "dedupe_hash" varchar(128) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text,
  "email" text,
  "emailVerified" timestamp,
  "image" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "account" (
  "userId" text NOT NULL,
  "type" text NOT NULL,
  "provider" text NOT NULL,
  "providerAccountId" text NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text,
  CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);

CREATE TABLE IF NOT EXISTS "session" (
  "sessionToken" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL,
  "expires" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "verificationToken" (
  "identifier" text NOT NULL,
  "token" text NOT NULL,
  "expires" timestamp NOT NULL,
  CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);

CREATE TABLE IF NOT EXISTS "profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "skills" text[] DEFAULT '{}' NOT NULL,
  "roles" text[] DEFAULT '{}' NOT NULL,
  "seniority" varchar(64),
  "locations" text[] DEFAULT '{}' NOT NULL,
  "remote_pref" varchar(32) DEFAULT 'any' NOT NULL,
  "languages" text[] DEFAULT '{}' NOT NULL,
  "onboarded" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE IF NOT EXISTS "saved_jobs" (
  "user_id" text NOT NULL,
  "job_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "saved_jobs_user_id_job_id_pk" PRIMARY KEY("user_id","job_id")
);

ALTER TABLE "raw_posts" ADD CONSTRAINT "raw_posts_channel_id_channels_id_fk"
  FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_channel_id_channels_id_fk"
  FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_raw_post_id_raw_posts_id_fk"
  FOREIGN KEY ("raw_post_id") REFERENCES "public"."raw_posts"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk"
  FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk"
  FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_job_id_jobs_id_fk"
  FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "raw_posts_channel_msg_uidx" ON "raw_posts" USING btree ("channel_id","tg_message_id");
CREATE UNIQUE INDEX IF NOT EXISTS "jobs_channel_msg_uidx" ON "jobs" USING btree ("channel_id","tg_message_id");
CREATE INDEX IF NOT EXISTS "jobs_posted_at_idx" ON "jobs" USING btree ("posted_at");
CREATE INDEX IF NOT EXISTS "jobs_dedupe_hash_idx" ON "jobs" USING btree ("dedupe_hash");
CREATE INDEX IF NOT EXISTS "jobs_active_idx" ON "jobs" USING btree ("is_active");
