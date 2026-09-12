import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-navy text-white",
        secondary: "border-transparent bg-gris-papel text-navy",
        outline: "text-foreground",
        lima: "border-transparent bg-lima text-navy",
        success: "border-transparent bg-[#e8edf5] text-navy-claro",
        warning: "border-transparent bg-lima/25 text-navy",
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
