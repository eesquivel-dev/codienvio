import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 font-sans text-xs font-semibold tracking-[-0.011em]",
  {
    variants: {
      variant: {
        default: "border-transparent bg-navy text-white",
        secondary: "border-transparent bg-secondary text-navy",
        outline: "border-navy/15 text-navy",
        success: "border-transparent bg-lima text-navy",
        warning: "border-transparent bg-[#f4e8b2] text-navy",
        destructive: "border-transparent bg-red-100 text-red-800",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
