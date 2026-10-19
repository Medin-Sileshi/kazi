import Link from "next/link";
import { redirect } from "next/navigation";
import { JobStream } from "@/components/job-stream";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { listForYou } from "@/lib/jobs-query";

export const dynamic = "force-dynamic";

export default async function ForYouPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/for-you");
  }

  const profileRows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1);
  const profile = profileRows[0];

  if (!profile?.onboarded) {
    redirect("/profile");
  }

  const jobs = await listForYou(session.user.id, 60);

  return (
    <section className="page">
      <h1>For you</h1>
      <p className="lede">
        Ranked from your skills, roles, and location prefs.{" "}
        <Link href="/profile">Edit profile</Link> ·{" "}
        <Link href="/#stream">Browse all</Link>
      </p>
      <JobStream
        jobs={jobs}
        emptyMessage="No strong matches yet — check back after the next ingest, or broaden your profile."
      />
    </section>
  );
}
