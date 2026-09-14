import Link from "next/link";
import { formatMxn } from "@/lib/money";
import type { ReportBreakdownRow } from "@/lib/reports";

export function BreakdownBars({
  rows,
  empty,
  valueKey = "clientPrice",
  hrefFor,
}: {
  rows: ReportBreakdownRow[];
  empty: string;
  valueKey?: "clientPrice" | "fee" | "topUp";
  hrefFor?: (row: ReportBreakdownRow) => string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  const max = Math.max(...rows.map((row) => Number(row[valueKey])), 1);
  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const value = Number(row[valueKey]);
        const width = Math.max(4, Math.round((value / max) * 100));
        const href = hrefFor?.(row);
        const inner = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-navy">{row.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {formatMxn(value)}
                {row.salesCount ? ` · ${row.salesCount} ventas` : ""}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-lima" style={{ width: `${width}%` }} />
            </div>
          </>
        );
        return (
          <li key={row.key}>
            {href ? (
              <Link href={href} className="block rounded-md hover:bg-lima/10">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function DaySparkBars({ rows }: { rows: ReportBreakdownRow[] }) {
  if (rows.length === 0) return null;
  const chronological = [...rows].sort((a, b) => a.key.localeCompare(b.key));
  const max = Math.max(...chronological.map((row) => row.clientPrice), 1);
  return (
    <div className="flex h-16 items-end gap-1" aria-hidden>
      {chronological.map((row) => (
        <div
          key={row.key}
          title={`${row.label}: ${formatMxn(row.clientPrice)}`}
          className="min-w-0 flex-1 rounded-sm bg-navy/80"
          style={{ height: `${Math.max(8, Math.round((row.clientPrice / max) * 100))}%` }}
        />
      ))}
    </div>
  );
}
