import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { SaveJobButton } from "@/components/save-job-button";
import { auth } from "@/lib/auth";
import { CATEGORY_LABELS, isJobCategory } from "@/lib/categories";
import { db } from "@/lib/db";
import { savedJobs } from "@/lib/db/schema";
import { getJobById } from "@/lib/jobs-query";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJobById(id);
  if (!job) notFound();

  const session = await auth();
  let initiallySaved = false;
  if (session?.user?.id) {
    const saved = await db
      .select()
      .from(savedJobs)
      .where(
        and(
          eq(savedJobs.userId, session.user.id),
          eq(savedJobs.jobId, job.id),
        ),
      )
      .limit(1);
    initiallySaved = Boolean(saved[0]);
  }

  const cats = (job.categories ?? [])
    .filter(isJobCategory)
    .map((c) => CATEGORY_LABELS[c]);

  return (
    <article className="page job-detail">
      <Link href="/#stream" className="muted">
        ← Back to board
      </Link>
      <h1>{job.title}</h1>
      <p className="lede">
        {[job.company, job.location].filter(Boolean).join(" · ") ||
          "See post for company and location"}
      </p>
      <div className="job-detail-meta">
        <time dateTime={job.postedAt.toISOString()}>
          {job.postedAt.toLocaleDateString()}
        </time>
        {cats.map((c) => (
          <span key={c}>{c}</span>
        ))}
        {job.remote ? <span>Remote</span> : null}
        <span>@{job.channelUsername}</span>
      </div>
      <div className="cta-row">
        <a
          href={job.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-accent"
        >
          Open in Telegram
        </a>
        {job.applyUrl ? (
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ink"
          >
            Apply link
          </a>
        ) : null}
        <SaveJobButton jobId={job.id} initiallySaved={initiallySaved} />
      </div>
      {(job.skills?.length ?? 0) > 0 ? (
        <p className="muted">Skills: {job.skills.join(", ")}</p>
      ) : null}
      <div className="job-body">{job.description || "No description parsed."}</div>
    </article>
  );
}
