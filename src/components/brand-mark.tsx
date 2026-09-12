import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  href?: string;
  variant?: "on-light" | "on-dark";
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * Product wordmark — not a CTI lockup.
 * Official logo files belong in /public/brand/ (see README there).
 * Do not invent, distort, recolor, or recompose the CTI mark.
 */
export function BrandMark({ href, variant = "on-light", size = "md", className }: BrandMarkProps) {
  const onDark = variant === "on-dark";
  const mark = (
    <span
      className={cn(
        "inline-flex flex-col leading-none",
        size === "sm" && "gap-0.5",
        size === "md" && "gap-1",
        size === "lg" && "gap-1.5",
        className,
      )}
    >
      <span
        className={cn(
          "font-bold tracking-tight",
          size === "sm" && "text-base",
          size === "md" && "text-lg",
          size === "lg" && "text-3xl",
          onDark ? "text-white" : "text-navy",
        )}
      >
        CodiEnvio
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 shrink-0 bg-lima" aria-hidden />
        <span
          className={cn(
            "font-medium uppercase tracking-[0.14em]",
            size === "lg" ? "text-[11px]" : "text-[9px]",
            onDark ? "text-white/70" : "text-azul-gris",
          )}
        >
          CTI Group
        </span>
      </span>
    </span>
  );

  if (!href) return mark;
  return (
    <Link href={href} className="inline-flex rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lima">
      {mark}
    </Link>
  );
}
