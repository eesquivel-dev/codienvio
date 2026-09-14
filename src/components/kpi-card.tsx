import type { ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  icon,
  label,
  value,
  hint,
  change,
  href,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  hint?: string;
  change?: number | null;
  href?: string;
}) {
  const body = (
    <Card
      className={cn(
        "h-full transition-colors",
        href && "hover:border-lima hover:shadow-sm",
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-[0.8125rem] font-medium tracking-[-0.011em] text-muted-foreground">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-[-0.03em] tabular-nums text-navy">{value}</p>
        {hint ? <p className="type-caption mt-1 text-muted-foreground">{hint}</p> : null}
        {change != null ? (
          <p className={`type-caption mt-1 ${change >= 0 ? "text-navy" : "text-destructive"}`}>
            {change > 0 ? "+" : ""}
            {change}% vs periodo anterior
          </p>
        ) : null}
      </CardContent>
    </Card>
  );

  if (!href) return body;

  return (
    <Link href={href} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {body}
    </Link>
  );
}
