import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listForYou, listJobs } from "@/lib/jobs-query";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const mode = searchParams.get("mode");
    const category = searchParams.get("category");
    const q = searchParams.get("q");
    const market = searchParams.get("market");
    const limit = Number(searchParams.get("limit") || "50");

    if (mode === "for-you") {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const items = await listForYou(session.user.id, limit);
      return NextResponse.json({ jobs: items });
    }

    const items = await listJobs({ category, q, market, limit });
    return NextResponse.json({ jobs: items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load jobs";
    if (message.includes("DATABASE_URL")) {
      return NextResponse.json({ jobs: [], warning: "Database not configured" });
    }
    console.error(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
