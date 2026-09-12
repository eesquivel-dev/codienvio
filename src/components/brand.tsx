import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  size = "md",
  tone = "default",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  tone?: "default" | "inverse";
}) {
  const box = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const icon = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg shadow-sm",
        tone === "inverse"
          ? "bg-primary-foreground text-primary"
          : "bg-primary text-primary-foreground",
        box,
        className,
      )}
    >
      <Package className={icon} />
    </span>
  );
}

export function BrandLockup({
  subtitle,
  size = "md",
  tone = "default",
}: {
  subtitle?: string;
  size?: "sm" | "md" | "lg";
  tone?: "default" | "inverse";
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <BrandMark size={size} tone={tone} />
      <span className="leading-tight">
        <span
          className={cn(
            "block font-semibold tracking-tight",
            size === "lg" ? "text-xl" : "text-base",
            tone === "inverse" && "text-primary-foreground",
          )}
        >
          CodiEnvio
        </span>
        {subtitle ? (
          <span
            className={cn(
              "block text-xs",
              tone === "inverse" ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
