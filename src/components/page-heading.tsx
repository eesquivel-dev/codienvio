import type { ReactNode } from "react";

export function PageHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div>
      <h1 className="type-title text-navy">{title}</h1>
      <div className="mt-2 h-1 w-10 bg-lima" aria-hidden />
      {children ? <p className="type-body mt-2 text-muted-foreground">{children}</p> : null}
    </div>
  );
}
