"use client";

import { useMemo, useState } from "react";
import { Field } from "@/components/field";
import { DateRangeFields, ListFilters } from "@/components/list-filters";
import { NativeSelect } from "@/components/native-select";
import { formatDateTimeMx } from "@/lib/format";
import { formatMxn } from "@/lib/money";
import { matchesDateRange, matchesQuery } from "@/lib/catalog-query";
import { walletTxnTypeLabel, type WalletLedgerRow, type WalletTxnType } from "@/lib/wallet-copy";

export function WalletLedgerList({
  rows,
  empty = "Aún no hay movimientos.",
}: {
  rows: WalletLedgerRow[];
  empty?: string;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"all" | WalletTxnType>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (type !== "all" && row.type !== type) return false;
      if (!matchesDateRange(row.createdAt, from, to)) return false;
      return matchesQuery([walletTxnTypeLabel(row.type), row.note, row.shipmentId], query);
    });
  }, [rows, query, type, from, to]);

  const hasActiveFilters = Boolean(query.trim() || type !== "all" || from || to);

  return (
    <div className="space-y-3">
      <ListFilters
        query={query}
        onQueryChange={setQuery}
        placeholder="Buscar por tipo, nota o guía"
        resultCount={filtered.length}
        totalCount={rows.length}
        noun="movimientos"
        hasActiveFilters={hasActiveFilters}
        onClear={() => {
          setQuery("");
          setType("all");
          setFrom("");
          setTo("");
        }}
      >
        <Field label="Tipo" htmlFor="ledger-type">
          <NativeSelect
            id="ledger-type"
            value={type}
            onChange={(event) => setType(event.target.value as typeof type)}
          >
            <option value="all">Todos</option>
            <option value="TOP_UP">Cargas</option>
            <option value="PURCHASE">Compras</option>
            <option value="ADJUSTMENT">Ajustes</option>
          </NativeSelect>
        </Field>
        <DateRangeFields from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      </ListFilters>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {rows.length === 0 ? empty : "Ningún movimiento coincide con los filtros."}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((row) => (
            <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span>
                {walletTxnTypeLabel(row.type)}
                {row.note ? ` · ${row.note}` : ""}
                <span className="block text-xs text-muted-foreground">{formatDateTimeMx(row.createdAt)}</span>
              </span>
              <span
                className={
                  row.amountMxn >= 0
                    ? "font-semibold tabular-nums text-navy"
                    : "font-semibold tabular-nums text-destructive"
                }
              >
                {row.amountMxn >= 0 ? "+" : ""}
                {formatMxn(row.amountMxn)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
