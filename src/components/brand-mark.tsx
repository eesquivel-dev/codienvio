import Image from "next/image";
import Link from "next/link";
import { brand, LOGO_ASPECT } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  href?: string;
  variant?: "on-light" | "on-dark";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const HEIGHT = { sm: 28, md: 36, lg: 56 } as const;

/**
 * Official Código Envío lockup on a transparent field.
 * Light chrome: lima + navy. Navy chrome: lima + white knockout.
 * Do not sit the mark on a white plate, distort, or recolor it in CSS.
 */
export function BrandMark({ href, variant = "on-light", size = "md", className }: BrandMarkProps) {
  const height = HEIGHT[size];
  const width = Math.round(height * LOGO_ASPECT);
  const onDark = variant === "on-dark";
  const src = onDark ? brand.logo.lockupOnDark : brand.logo.lockup;

  const mark = (
    <span className={cn("inline-flex shrink-0 items-center bg-transparent", className)}>
      <Image
        src={src}
        alt={brand.name}
        width={width}
        height={height}
        className="h-auto w-auto max-w-none bg-transparent"
        style={{ height, width: "auto", backgroundColor: "transparent" }}
        priority
      />
    </span>
  );

  if (!href) return mark;
  return (
    <Link href={href} className="inline-flex rounded-sm bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lima">
      {mark}
    </Link>
  );
}
