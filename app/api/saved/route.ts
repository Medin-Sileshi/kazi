import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { channels, jobs, savedJobs } from "@/lib/db/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      job: jobs,
      channelUsername: channels.username,
      channelTitle: channels.title,
      savedAt: savedJobs.createdAt,
    })
    .from(savedJobs)
    .innerJoin(jobs, eq(savedJobs.jobId, jobs.id))
    .leftJoin(channels, eq(jobs.channelId, channels.id))
    .where(eq(savedJobs.userId, session.user.id))
    .orderBy(desc(savedJobs.createdAt));

  return NextResponse.json({
    jobs: rows.map((r) => ({
      ...r.job,
      channelUsername: r.channelUsername,
      channelTitle: r.channelTitle,
      savedAt: r.savedAt,
    })),
  });
}

const bodySchema = z.object({
  jobId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
  }

  await db
    .insert(savedJobs)
    .values({ userId: session.user.id, jobId: parsed.data.jobId })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  await db
    .delete(savedJobs)
    .where(
      and(eq(savedJobs.userId, session.user.id), eq(savedJobs.jobId, jobId)),
    );

  return NextResponse.json({ ok: true });
}
