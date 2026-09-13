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
 * Official Código Envío lockup.
 * On navy chrome the mark sits on a white field so lima + navy stay visible.
 * Do not distort, recolor, or recompose the lockup.
 */
export function BrandMark({ href, variant = "on-light", size = "md", className }: BrandMarkProps) {
  const height = HEIGHT[size];
  const width = Math.round(height * LOGO_ASPECT);
  const onDark = variant === "on-dark";

  const mark = (
    <span
      className={cn(
        "inline-flex shrink-0 items-center",
        onDark && "rounded-md bg-white px-2 py-1 shadow-sm",
        className,
      )}
    >
      <Image
        src={brand.logo.lockup}
        alt={brand.name}
        width={width}
        height={height}
        className="h-auto w-auto max-w-none"
        style={{ height, width: "auto" }}
        priority
      />
    </span>
  );

  if (!href) return mark;
  return (
    <Link href={href} className="inline-flex rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lima">
      {mark}
    </Link>
  );
}
