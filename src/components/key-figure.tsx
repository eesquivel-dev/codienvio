import { cn } from "@/lib/utils";

/** Lima accent for key figures (prices, KPIs) — never used as a large text block. */
export function KeyFigure({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-lima px-2 py-0.5 text-sm font-semibold text-navy",
        className,
      )}
    >
      {children}
    </span>
  );
}
