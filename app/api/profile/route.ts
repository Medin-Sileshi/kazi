import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

const profileSchema = z.object({
  skills: z.array(z.string()).default([]),
  roles: z.array(z.string()).default([]),
  seniority: z.string().optional().nullable(),
  locations: z.array(z.string()).default([]),
  remotePref: z.enum(["any", "remote", "onsite"]).default("any"),
  languages: z.array(z.string()).default([]),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1);

  return NextResponse.json({ profile: rows[0] ?? null });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const [profile] = await db
    .insert(profiles)
    .values({
      userId: session.user.id,
      skills: data.skills.map((s) => s.trim()).filter(Boolean),
      roles: data.roles.map((s) => s.trim()).filter(Boolean),
      seniority: data.seniority || null,
      locations: data.locations.map((s) => s.trim()).filter(Boolean),
      remotePref: data.remotePref,
      languages: data.languages.map((s) => s.trim()).filter(Boolean),
      onboarded: true,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        skills: data.skills.map((s) => s.trim()).filter(Boolean),
        roles: data.roles.map((s) => s.trim()).filter(Boolean),
        seniority: data.seniority || null,
        locations: data.locations.map((s) => s.trim()).filter(Boolean),
        remotePref: data.remotePref,
        languages: data.languages.map((s) => s.trim()).filter(Boolean),
        onboarded: true,
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json({ profile });
}
