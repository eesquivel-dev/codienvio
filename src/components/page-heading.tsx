import type { ReactNode } from "react";

export function PageHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-navy">{title}</h1>
      <div className="mt-2 h-1 w-10 bg-lima" aria-hidden />
      {children ? <p className="mt-2 text-sm text-muted-foreground">{children}</p> : null}
    </div>
  );
}
