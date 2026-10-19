import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ProfileForm } from "@/components/profile-form";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/profile");
  }

  const profileRows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1);
  const profile = profileRows[0] ?? null;

  return (
    <section className="page">
      <h1>{profile?.onboarded ? "Your profile" : "Set up your profile"}</h1>
      <p className="lede">
        Short form. We use this to rank Telegram jobs for you — Ethiopia local
        and global remote.
      </p>
      <ProfileForm profile={profile ?? null} />
    </section>
  );
}
