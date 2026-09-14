"use client";

import type { ReactNode } from "react";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ListFilters({
  query,
  onQueryChange,
  placeholder = "Buscar",
  children,
  resultCount,
  totalCount,
  noun = "resultados",
  onClear,
  hasActiveFilters,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
  children?: ReactNode;
  resultCount?: number;
  totalCount?: number;
  noun?: string;
  onClear?: () => void;
  hasActiveFilters?: boolean;
}) {
  return (
    <div className="relative space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Buscar" htmlFor="list-search">
          <Input
            id="list-search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={placeholder}
          />
        </Field>
        {children}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {resultCount != null && totalCount != null ? (
          <p className="text-sm text-muted-foreground">
            {resultCount} de {totalCount} {noun}
          </p>
        ) : (
          <span />
        )}
        {onClear && hasActiveFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Limpiar filtros
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function DateRangeFields({
  from,
  to,
  onFromChange,
  onToChange,
  fromId = "list-from",
  toId = "list-to",
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  fromId?: string;
  toId?: string;
}) {
  return (
    <>
      <Field label="Desde" htmlFor={fromId}>
        <Input id={fromId} type="date" value={from} onChange={(event) => onFromChange(event.target.value)} />
      </Field>
      <Field label="Hasta" htmlFor={toId}>
        <Input id={toId} type="date" value={to} onChange={(event) => onToChange(event.target.value)} />
      </Field>
    </>
  );
}
