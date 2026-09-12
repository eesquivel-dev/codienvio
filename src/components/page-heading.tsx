import { cn } from "@/lib/utils";

export function PageHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {eyebrow ? (
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-navy-claro">{eyebrow}</p>
      ) : null}
      <h1 className="text-2xl font-bold tracking-tight text-navy md:text-[1.75rem]">{title}</h1>
      {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      <div className="h-1 w-10 bg-lima" aria-hidden />
    </div>
  );
}
