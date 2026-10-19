import Link from "next/link";
import type { JobWithChannel } from "@/lib/jobs-query";
import { CATEGORY_LABELS, isJobCategory } from "@/lib/categories";

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(d);
}

function categoryLabel(cats: string[] | null) {
  const first = cats?.[0];
  if (first && isJobCategory(first)) return CATEGORY_LABELS[first];
  return "Other";
}

export function JobStream({
  jobs,
  emptyMessage = "No jobs match these filters yet.",
}: {
  jobs: (JobWithChannel & { score?: number; reasons?: string[] })[];
  emptyMessage?: string;
}) {
  if (!jobs.length) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  return (
    <ol className="job-stream">
      {jobs.map((job, i) => (
        <li
          key={job.id}
          className="job-row"
          style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
        >
          <Link href={`/jobs/${job.id}`} className="job-row-main">
            <div className="job-row-meta">
              <time dateTime={job.postedAt.toISOString()}>
                {formatDate(job.postedAt)}
              </time>
              <span>{categoryLabel(job.categories)}</span>
              {job.remote || job.tags?.includes("remote") ? (
                <span>Remote</span>
              ) : null}
              {job.tags?.includes("ethiopia") ? <span>Ethiopia</span> : null}
            </div>
            <h3>{job.title}</h3>
            <p className="job-row-sub">
              {[job.company, job.location].filter(Boolean).join(" · ") ||
                "Details in post"}
            </p>
            {job.reasons?.length ? (
              <p className="job-reasons">Matched: {job.reasons.join(" · ")}</p>
            ) : null}
          </Link>
          <div className="job-row-aside">
            <span className="channel-tag">
              @{job.channelUsername ?? "channel"}
            </span>
            <a
              href={job.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="source-link"
            >
              Open in TG
            </a>
          </div>
        </li>
      ))}
    </ol>
  );
}
