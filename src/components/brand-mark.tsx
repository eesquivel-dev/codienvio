import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  href?: string;
  variant?: "onLight" | "onNavy";
  compact?: boolean;
  /** Official asset path from getBrandLogoSrc(). Omit to use the wordmark. */
  src?: string | null;
  className?: string;
};

function Wordmark({ variant, compact }: { variant: "onLight" | "onNavy"; compact?: boolean }) {
  const onNavy = variant === "onNavy";
  return (
    <span className="flex flex-col leading-none">
      <span
        className={cn(
          "font-bold tracking-tight",
          onNavy ? "text-white" : "text-navy",
          compact ? "text-lg" : "text-xl",
        )}
      >
        CodiEnvio
      </span>
      <span
        className={cn(
          "mt-1.5 text-[10px] font-medium uppercase tracking-[0.2em]",
          onNavy ? "text-lima" : "text-navy-claro",
        )}
      >
        CTI Group
      </span>
    </span>
  );
}

export function BrandMark({
  href,
  variant = "onLight",
  compact,
  src,
  className,
}: BrandMarkProps) {
  const content = src ? (
    // Official files: object-contain only — no filters, rotation, or recoloring.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="CodiEnvio · CTI Group"
      className={cn("h-8 w-auto object-contain object-left", className)}
    />
  ) : (
    <span className={cn("inline-flex items-center", className)}>
      <Wordmark variant={variant} compact={compact} />
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="inline-flex shrink-0" aria-label="CodiEnvio · CTI Group">
      {content}
    </Link>
  );
}
