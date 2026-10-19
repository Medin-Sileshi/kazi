import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { channels, jobs, profiles, type Job } from "@/lib/db/schema";
import { isJobCategory } from "@/lib/categories";
import { rankJobs, type ScoredJob } from "@/lib/matching";

export type JobWithChannel = Job & {
  channelUsername: string | null;
  channelTitle: string | null;
};

export async function listJobs(opts: {
  category?: string | null;
  q?: string | null;
  market?: string | null;
  limit?: number;
}): Promise<JobWithChannel[]> {
  const limit = Math.min(opts.limit ?? 50, 100);
  const conditions: SQL[] = [eq(jobs.isActive, true)];

  if (opts.category && isJobCategory(opts.category)) {
    conditions.push(sql`${opts.category} = ANY(${jobs.categories})`);
  }

  if (opts.market === "ethiopia") {
    conditions.push(
      or(
        sql`${"ethiopia"} = ANY(${jobs.tags})`,
        ilike(jobs.location, "%ethiopia%"),
        ilike(jobs.location, "%addis%"),
      )!,
    );
  } else if (opts.market === "remote") {
    conditions.push(
      or(eq(jobs.remote, true), sql`${"remote"} = ANY(${jobs.tags})`)!,
    );
  }

  if (opts.q?.trim()) {
    const q = `%${opts.q.trim()}%`;
    conditions.push(
      or(
        ilike(jobs.title, q),
        ilike(jobs.company, q),
        ilike(jobs.description, q),
        ilike(jobs.location, q),
      )!,
    );
  }

  const rows = await db
    .select({
      job: jobs,
      channelUsername: channels.username,
      channelTitle: channels.title,
    })
    .from(jobs)
    .leftJoin(channels, eq(jobs.channelId, channels.id))
    .where(and(...conditions))
    .orderBy(desc(jobs.postedAt))
    .limit(limit);

  return rows.map((r) => ({
    ...r.job,
    channelUsername: r.channelUsername,
    channelTitle: r.channelTitle,
  }));
}

export async function getJobById(id: string): Promise<JobWithChannel | null> {
  const rows = await db
    .select({
      job: jobs,
      channelUsername: channels.username,
      channelTitle: channels.title,
    })
    .from(jobs)
    .leftJoin(channels, eq(jobs.channelId, channels.id))
    .where(eq(jobs.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return {
    ...row.job,
    channelUsername: row.channelUsername,
    channelTitle: row.channelTitle,
  };
}

export async function listForYou(
  userId: string,
  limit = 50,
): Promise<(ScoredJob & { channelUsername: string | null; channelTitle: string | null })[]> {
  const profileRows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  const profile = profileRows[0];
  if (!profile) return [];

  const recent = await listJobs({ limit: 150 });
  const ranked = rankJobs(recent, profile).slice(0, limit);

  return ranked.map((j) => {
    const base = recent.find((r) => r.id === j.id);
    return {
      ...j,
      channelUsername: base?.channelUsername ?? null,
      channelTitle: base?.channelTitle ?? null,
    };
  });
}
