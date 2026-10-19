"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useTransition } from "react";

export function JobFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    const q = String(form.get("q") || "").trim();
    const market = String(form.get("market") || "");
    const category = searchParams.get("category");
    if (q) params.set("q", q);
    if (market) params.set("market", market);
    if (category) params.set("category", category);
    startTransition(() => {
      router.push(`/?${params.toString()}#stream`);
    });
  }

  return (
    <form className="job-filters" onSubmit={onSubmit}>
      <label className="filter-field">
        <span>Search</span>
        <input
          name="q"
          type="search"
          placeholder="Role, skill, company…"
          defaultValue={searchParams.get("q") ?? ""}
        />
      </label>
      <label className="filter-field">
        <span>Market</span>
        <select name="market" defaultValue={searchParams.get("market") ?? ""}>
          <option value="">All markets</option>
          <option value="ethiopia">Ethiopia</option>
          <option value="remote">Remote / global</option>
        </select>
      </label>
      <button type="submit" className="btn btn-ink" disabled={pending}>
        {pending ? "Filtering…" : "Apply"}
      </button>
    </form>
  );
}
