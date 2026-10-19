"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import type { Profile } from "@/lib/db/schema";

function toCsv(values: string[] | null | undefined) {
  return (values ?? []).join(", ");
}

function fromCsv(value: string) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);
    const form = new FormData(e.currentTarget);
    const body = {
      skills: fromCsv(String(form.get("skills") || "")),
      roles: fromCsv(String(form.get("roles") || "")),
      seniority: String(form.get("seniority") || "") || null,
      locations: fromCsv(String(form.get("locations") || "")),
      remotePref: String(form.get("remotePref") || "any"),
      languages: fromCsv(String(form.get("languages") || "")),
    };

    startTransition(async () => {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError("Could not save profile");
        return;
      }
      setOk(true);
      router.push("/for-you");
      router.refresh();
    });
  }

  return (
    <form className="profile-form" onSubmit={onSubmit}>
      <label>
        <span>Skills</span>
        <input
          name="skills"
          defaultValue={toCsv(profile?.skills)}
          placeholder="React, Python, Figma"
          required
        />
      </label>
      <label>
        <span>Target roles</span>
        <input
          name="roles"
          defaultValue={toCsv(profile?.roles)}
          placeholder="Frontend engineer, Product designer"
          required
        />
      </label>
      <label>
        <span>Seniority</span>
        <select name="seniority" defaultValue={profile?.seniority ?? ""}>
          <option value="">Any</option>
          <option value="intern">Intern</option>
          <option value="junior">Junior</option>
          <option value="mid">Mid</option>
          <option value="senior">Senior</option>
          <option value="lead">Lead</option>
        </select>
      </label>
      <label>
        <span>Locations</span>
        <input
          name="locations"
          defaultValue={toCsv(profile?.locations)}
          placeholder="Addis Ababa, Ethiopia, Remote"
        />
      </label>
      <label>
        <span>Remote preference</span>
        <select name="remotePref" defaultValue={profile?.remotePref ?? "any"}>
          <option value="any">Any</option>
          <option value="remote">Remote only</option>
          <option value="onsite">On-site / hybrid</option>
        </select>
      </label>
      <label>
        <span>Languages</span>
        <input
          name="languages"
          defaultValue={toCsv(profile?.languages)}
          placeholder="English, Amharic"
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      {ok ? <p className="form-ok">Saved.</p> : null}
      <button type="submit" className="btn btn-accent" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
