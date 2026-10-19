import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export async function SiteHeader() {
  let session = null;
  try {
    session = await auth();
  } catch {
    session = null;
  }

  return (
    <header className="site-header">
      <Link href="/" className="brand-mark">
        Kazi
      </Link>
      <nav className="site-nav" aria-label="Primary">
        <Link href="/#stream">Browse</Link>
        {session?.user ? (
          <>
            <Link href="/for-you">For you</Link>
            <Link href="/profile">Profile</Link>
            <SignOutButton />
          </>
        ) : (
          <Link href="/sign-in">Sign in</Link>
        )}
      </nav>
    </header>
  );
}
