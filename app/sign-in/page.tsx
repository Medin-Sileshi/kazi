import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { TelegramLogin } from "@/components/telegram-login";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const { callbackUrl, error } = await searchParams;
  if (session?.user) {
    redirect(callbackUrl || "/for-you");
  }

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "";

  return (
    <section className="page">
      <h1>Sign in</h1>
      <p className="lede">
        Guests can browse freely. Sign in to save jobs and get a For you feed.
      </p>
      {error ? (
        <p className="form-error">
          Sign-in failed ({error}). Clear site cookies for localhost, then try
          again. In Firefox: address-bar shield → turn off tracking protection
          for this site.
        </p>
      ) : null}
      <div className="sign-in-panel">
        <GoogleSignInButton callbackUrl={callbackUrl || "/for-you"} />
        {botUsername ? (
          <>
            <p className="sign-in-divider">or Telegram</p>
            <TelegramLogin botUsername={botUsername} />
          </>
        ) : (
          <p className="muted">Telegram login not configured yet.</p>
        )}
      </div>
    </section>
  );
}
