import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const JOB_CATEGORIES = [
  "engineering",
  "design",
  "product",
  "marketing",
  "sales",
  "ops",
  "finance",
  "internship",
  "other",
] as const;

export type JobCategory = (typeof JOB_CATEGORIES)[number];

export const channels = pgTable("channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 512 }),
  market: varchar("market", { length: 32 }).notNull().default("both"),
  languageHint: varchar("language_hint", { length: 64 }),
  active: boolean("active").notNull().default(true),
  lastMessageId: integer("last_message_id").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const rawPosts = pgTable(
  "raw_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    tgMessageId: integer("tg_message_id").notNull(),
    text: text("text").notNull().default(""),
    postedAt: timestamp("posted_at", { mode: "date" }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("raw_posts_channel_msg_uidx").on(t.channelId, t.tgMessageId),
  ],
);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    rawPostId: uuid("raw_post_id").references(() => rawPosts.id, {
      onDelete: "set null",
    }),
    tgMessageId: integer("tg_message_id").notNull(),
    title: varchar("title", { length: 512 }).notNull(),
    company: varchar("company", { length: 512 }),
    location: varchar("location", { length: 512 }),
    description: text("description").notNull().default(""),
    categories: text("categories").array().notNull().default([]),
    skills: text("skills").array().notNull().default([]),
    tags: text("tags").array().notNull().default([]),
    remote: boolean("remote").notNull().default(false),
    employmentType: varchar("employment_type", { length: 64 }),
    salaryText: varchar("salary_text", { length: 256 }),
    applyUrl: text("apply_url"),
    sourceUrl: text("source_url").notNull(),
    postedAt: timestamp("posted_at", { mode: "date" }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    dedupeHash: varchar("dedupe_hash", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("jobs_channel_msg_uidx").on(t.channelId, t.tgMessageId),
    index("jobs_posted_at_idx").on(t.postedAt),
    index("jobs_dedupe_hash_idx").on(t.dedupeHash),
    index("jobs_active_idx").on(t.isActive),
  ],
);

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  skills: text("skills").array().notNull().default([]),
  roles: text("roles").array().notNull().default([]),
  seniority: varchar("seniority", { length: 64 }),
  locations: text("locations").array().notNull().default([]),
  remotePref: varchar("remote_pref", { length: 32 }).notNull().default("any"),
  languages: text("languages").array().notNull().default([]),
  onboarded: boolean("onboarded").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const savedJobs = pgTable(
  "saved_jobs",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.jobId] })],
);

export type Channel = typeof channels.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type User = typeof users.$inferSelect;
