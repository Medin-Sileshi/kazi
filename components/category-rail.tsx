import Link from "next/link";
import { CATEGORY_LABELS, JOB_CATEGORIES } from "@/lib/categories";

export function CategoryRail({
  active,
  market,
  q,
}: {
  active?: string | null;
  market?: string | null;
  q?: string | null;
}) {
  const params = new URLSearchParams();
  if (market) params.set("market", market);
  if (q) params.set("q", q);
  const qs = params.toString();

  return (
    <nav className="category-rail" aria-label="Job categories">
      <Link
        href={qs ? `/?${qs}` : "/"}
        className={!active ? "active" : undefined}
        scroll={false}
      >
        All
      </Link>
      {JOB_CATEGORIES.map((cat) => {
        const p = new URLSearchParams(params);
        p.set("category", cat);
        return (
          <Link
            key={cat}
            href={`/?${p.toString()}#stream`}
            className={active === cat ? "active" : undefined}
            scroll={false}
          >
            {CATEGORY_LABELS[cat]}
          </Link>
        );
      })}
    </nav>
  );
}
