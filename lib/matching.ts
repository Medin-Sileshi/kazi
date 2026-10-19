import type { Job, Profile } from "@/lib/db/schema";

export type ScoredJob = Job & { score: number; reasons: string[] };

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function daysSince(date: Date): number {
  return Math.max(0, (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export function scoreJob(job: Job, profile: Profile): ScoredJob {
  let score = 0;
  const reasons: string[] = [];

  const jobSkills = (job.skills ?? []).map(normalize);
  const profileSkills = (profile.skills ?? []).map(normalize);
  const skillHits = profileSkills.filter((s) =>
    jobSkills.some((js) => js.includes(s) || s.includes(js)),
  );
  if (skillHits.length) {
    score += skillHits.length * 12;
    reasons.push(skillHits.slice(0, 3).join(" · "));
  }

  const title = normalize(job.title);
  const desc = normalize(job.description ?? "");
  const roleHits = (profile.roles ?? [])
    .map(normalize)
    .filter((r) => r && (title.includes(r) || desc.includes(r)));
  if (roleHits.length) {
    score += roleHits.length * 15;
    reasons.push(roleHits[0]!);
  }

  const tags = (job.tags ?? []).map(normalize);
  const remotePref = normalize(profile.remotePref || "any");
  if (remotePref === "remote" && (job.remote || tags.includes("remote"))) {
    score += 10;
    reasons.push("Remote");
  } else if (remotePref === "onsite" && !job.remote && !tags.includes("remote")) {
    score += 6;
  } else if (remotePref === "any") {
    score += 2;
  }

  const locs = (profile.locations ?? []).map(normalize);
  const jobLoc = normalize(job.location ?? "");
  if (locs.some((l) => l && (jobLoc.includes(l) || tags.includes(l)))) {
    score += 10;
    if (locs.some((l) => l.includes("ethiopia") || l.includes("addis"))) {
      reasons.push("Ethiopia");
    } else {
      reasons.push(locs[0]!);
    }
  } else if (
    tags.includes("ethiopia") &&
    locs.some((l) => l.includes("ethiopia") || l.includes("addis"))
  ) {
    score += 10;
    reasons.push("Ethiopia");
  }

  const seniority = normalize(profile.seniority ?? "");
  if (seniority) {
    const hay = `${title} ${desc}`;
    if (hay.includes(seniority)) {
      score += 5;
    } else if (
      (seniority === "senior" && hay.includes("junior")) ||
      (seniority === "junior" && hay.includes("senior")) ||
      (seniority === "intern" && hay.includes("senior"))
    ) {
      score -= 8;
    }
  }

  const age = daysSince(job.postedAt);
  const recency = Math.max(0, 20 - age * 1.5);
  score += recency;

  return { ...job, score, reasons: reasons.slice(0, 4) };
}

export function rankJobs(jobs: Job[], profile: Profile): ScoredJob[] {
  return jobs
    .map((j) => scoreJob(j, profile))
    .sort((a, b) => b.score - a.score || b.postedAt.getTime() - a.postedAt.getTime());
}
