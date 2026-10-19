"use client";

import { useState } from "react";

/**
 * Native form POST to Auth.js — more reliable in Firefox than signIn()
 * (avoids client fetch + CSRF cookie race with Enhanced Tracking Protection).
 */
export function GoogleSignInButton({
  callbackUrl = "/for-you",
}: {
  callbackUrl?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startGoogleSignIn() {
    setPending(true);
    setError(null);
    try {
      const csrfRes = await fetch("/api/auth/csrf", { credentials: "same-origin" });
      if (!csrfRes.ok) throw new Error("Could not load CSRF token");
      const { csrfToken } = (await csrfRes.json()) as { csrfToken?: string };
      if (!csrfToken) throw new Error("Missing CSRF token");

      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/auth/signin/google";
      form.style.display = "none";

      const csrf = document.createElement("input");
      csrf.name = "csrfToken";
      csrf.value = csrfToken;
      form.appendChild(csrf);

      const cb = document.createElement("input");
      cb.name = "callbackUrl";
      cb.value = callbackUrl;
      form.appendChild(cb);

      document.body.appendChild(form);
      form.submit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="btn btn-ink"
        disabled={pending}
        onClick={() => void startGoogleSignIn()}
      >
        {pending ? "Redirecting…" : "Continue with Google"}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
