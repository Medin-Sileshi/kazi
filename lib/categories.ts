import type { JobCategory } from "@/lib/db/schema";
import { JOB_CATEGORIES } from "@/lib/db/schema";

export const CATEGORY_LABELS: Record<JobCategory, string> = {
  engineering: "Engineering",
  design: "Design",
  product: "Product",
  marketing: "Marketing",
  sales: "Sales",
  ops: "Ops",
  finance: "Finance",
  internship: "Internships",
  other: "Other",
};

export { JOB_CATEGORIES };

export function isJobCategory(value: string): value is JobCategory {
  return (JOB_CATEGORIES as readonly string[]).includes(value);
}
