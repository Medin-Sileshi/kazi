import Link from "next/link";
import { Suspense } from "react";
import { CategoryRail } from "@/components/category-rail";
import { JobFilters } from "@/components/job-filters";
import { JobStream } from "@/components/job-stream";
import { auth } from "@/lib/auth";
import { listJobs } from "@/lib/jobs-query";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; market?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();

  let jobs: Awaited<ReturnType<typeof listJobs>> = [];
  let dbWarning: string | null = null;
  try {
    jobs = await listJobs({
      category: params.category,
      q: params.q,
      market: params.market,
      limit: 60,
    });
  } catch (err) {
    dbWarning =
      err instanceof Error ? err.message : "Could not load jobs from database";
  }

  return (
    <>
      <section className="hero">
        <p className="hero-brand">Kazi</p>
        <h1 className="hero-line">Jobs from Telegram, sorted for humans.</h1>
        <p className="hero-sub">
          Ethiopia boards and global remote posts, pulled from public channels —
          no bot spam, just the feed.
        </p>
        <div className="cta-row">
          <a href="#stream" className="btn btn-accent">
            Browse jobs
          </a>
          {session?.user ? (
            <Link href="/for-you" className="btn btn-ink">
              For you
            </Link>
          ) : (
            <Link href="/sign-in" className="btn btn-ink">
              Create profile
            </Link>
          )}
        </div>
      </section>

      <section id="stream" className="stream-section">
        <div className="stream-head">
          <h2>The board</h2>
          <CategoryRail
            active={params.category}
            market={params.market}
            q={params.q}
          />
          <Suspense fallback={null}>
            <JobFilters />
          </Suspense>
        </div>
        {dbWarning ? (
          <p className="empty-state">
            Database not connected yet. Set <code>DATABASE_URL</code> and run
            migrations to load jobs.
          </p>
        ) : (
          <JobStream jobs={jobs} />
        )}
      </section>
    </>
  );
}
