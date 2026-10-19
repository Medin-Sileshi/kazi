"use client";

import { useState, useTransition } from "react";

export function SaveJobButton({
  jobId,
  initiallySaved = false,
}: {
  jobId: string;
  initiallySaved?: boolean;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      try {
        if (saved) {
          const res = await fetch(`/api/saved?jobId=${jobId}`, {
            method: "DELETE",
          });
          if (res.status === 401) {
            window.location.href = "/sign-in";
            return;
          }
          if (!res.ok) throw new Error("Could not unsave");
          setSaved(false);
        } else {
          const res = await fetch("/api/saved", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId }),
          });
          if (res.status === 401) {
            window.location.href = "/sign-in";
            return;
          }
          if (!res.ok) throw new Error("Could not save");
          setSaved(true);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="save-wrap">
      <button
        type="button"
        className={`btn ${saved ? "btn-ghost" : "btn-accent"}`}
        onClick={toggle}
        disabled={pending}
      >
        {pending ? "…" : saved ? "Saved" : "Save job"}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
