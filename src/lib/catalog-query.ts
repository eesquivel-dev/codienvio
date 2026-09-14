import { toMxDateString } from "@/lib/billing";

/** Case-insensitive substring match across any of the provided fields. */
export function matchesQuery(haystack: Array<string | null | undefined>, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystack
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .toLowerCase()
    .includes(q);
}

/** Inclusive calendar-day range in America/Mexico_City (`YYYY-MM-DD`). */
export function matchesDateRange(iso: string | Date, from?: string | null, to?: string | null): boolean {
  const day = toMxDateString(iso);
  const start = from?.trim() || null;
  const end = to?.trim() || null;
  if (start && day < start) return false;
  if (end && day > end) return false;
  return true;
}
