"use client";

import { useMemo, useState } from "react";
import { markBillingPeriodAction } from "@/app/admin/actions";
import { ClientTypeahead } from "@/components/client-typeahead";
import { Field } from "@/components/field";
import { DateRangeFields, ListFilters } from "@/components/list-filters";
import { NativeSelect } from "@/components/native-select";
import { matchesQuery } from "@/lib/catalog-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  billingEventKindLabel,
  billingPeriodKey,
  billingPeriodStatusLabel,
  buildClientStatement,
  filterBillingEvents,
  formatMxMonthLabel,
  sumBillingTotals,
  type BillingEvent,
  type BillingEventKind,
} from "@/lib/billing";
import { formatDateTimeMx } from "@/lib/format";
import { formatMxn } from "@/lib/money";

type PeriodRow = {
  clientId: string;
  year: number;
  month: number;
  status: "OPEN" | "FACTURADO";
  note: string | null;
};

export function BillingConsole({
  events,
  clients,
  periods,
  defaultYear,
  defaultMonth,
  defaultFrom,
  defaultTo,
  initialFrom,
  initialTo,
  initialKind,
  initialClientId,
}: {
  events: BillingEvent[];
  clients: Array<{ id: string; companyName: string; balanceMxn: number; active: boolean }>;
  periods: PeriodRow[];
  defaultYear: number;
  defaultMonth: number;
  defaultFrom: string;
  defaultTo: string;
  initialFrom?: string;
  initialTo?: string;
  initialKind?: string;
  initialClientId?: string;
}) {
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState(initialClientId?.trim() ?? "");
  const [statementClientId, setStatementClientId] = useState(initialClientId?.trim() || clients[0]?.id || "");
  const [from, setFrom] = useState(initialFrom?.trim() || defaultFrom);
  const [to, setTo] = useState(initialTo?.trim() || defaultTo);
  const [kind, setKind] = useState<BillingEventKind | "ALL">(
    initialKind === "SALE" || initialKind === "TOP_UP" || initialKind === "ADJUSTMENT"
      ? initialKind
      : "ALL",
  );
  const [year, setYear] = useState(String(defaultYear));
  const [month, setMonth] = useState(String(defaultMonth));
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    return filterBillingEvents(events, { clientId, from, to, kind }).filter((event) =>
      matchesQuery(
        [event.clientName, event.trackingNumber, event.note, billingEventKindLabel(event.kind)],
        query,
      ),
    );
  }, [events, clientId, from, to, kind, query]);
  const totals = useMemo(() => sumBillingTotals(filtered), [filtered]);

  const period = billingPeriodKey(Number(year), Number(month));
  const statementClient = clients.find((client) => client.id === statementClientId) ?? null;
  const periodStatus =
    periods.find(
      (row) =>
        statementClient &&
        row.clientId === statementClient.id &&
        row.year === period.year &&
        row.month === period.month,
    )?.status ?? "OPEN";

  const statement = statementClient
    ? buildClientStatement({
        clientId: statementClient.id,
        clientName: statementClient.companyName,
        balanceMxn: statementClient.balanceMxn,
        year: period.year,
        month: period.month,
        status: periodStatus,
        events,
      })
    : null;

  async function onMark(status: "OPEN" | "FACTURADO") {
    if (!statementClient) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.set("clientId", statementClient.id);
    formData.set("year", String(period.year));
    formData.set("month", String(period.month));
    formData.set("status", status);
    formData.set("note", note);
    const result = await markBillingPeriodAction(formData);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(
      status === "FACTURADO"
        ? `Periodo ${formatMxMonthLabel(period.year, period.month)} marcado como facturado.`
        : `Periodo ${formatMxMonthLabel(period.year, period.month)} reabierto.`,
    );
  }

  return (
    <div className="space-y-6">
      <ListFilters
        query={query}
        onQueryChange={setQuery}
        placeholder="Buscar cliente, rastreo o nota"
        resultCount={filtered.length}
        totalCount={events.length}
        noun="movimientos"
        hasActiveFilters={Boolean(
          query.trim() || clientId || kind !== "ALL" || from !== defaultFrom || to !== defaultTo,
        )}
        onClear={() => {
          setQuery("");
          setClientId("");
          setKind("ALL");
          setFrom(defaultFrom);
          setTo(defaultTo);
        }}
      >
        <ClientTypeahead
          id="billing-client"
          value={clientId}
          onChange={(id) => {
            setClientId(id);
            if (id) setStatementClientId(id);
          }}
          initialSelected={
            clients
              .filter((client) => client.id === (initialClientId ?? clientId))
              .map((client) => ({
                id: client.id,
                companyName: client.companyName,
                email: "",
                active: client.active,
              }))[0] ?? null
          }
        />
        <Field label="Tipo" htmlFor="billing-kind">
          <NativeSelect
            id="billing-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as BillingEventKind | "ALL")}
          >
            <option value="ALL">Todos</option>
            <option value="SALE">Ventas (guías)</option>
            <option value="TOP_UP">Cargas de saldo</option>
            <option value="ADJUSTMENT">Ajustes</option>
          </NativeSelect>
        </Field>
        <DateRangeFields
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          fromId="billing-from"
          toId="billing-to"
        />
      </ListFilters>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Precio cliente" value={formatMxn(totals.clientPrice)} hint={`${totals.salesCount} ventas`} />
        <MiniStat label="Comisión" value={formatMxn(totals.fee)} hint="Margen operativo" />
        <MiniStat label="Costo Envía" value={formatMxn(totals.providerCost)} hint="Solo admin" />
        <MiniStat
          label="Cargas de saldo"
          value={formatMxn(totals.topUp)}
          hint={totals.adjustment ? `Ajustes ${formatMxn(totals.adjustment)}` : "Recargas al wallet"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos</CardTitle>
          <CardDescription>
            Las ventas son compras de guía (precio al cliente, comisión y costo Envía). Las cargas y
            ajustes salen del saldo. Una guía no se lista dos veces.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead>Costo Envía</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      {events.length === 0
                        ? "Aún no hay ventas ni cargas. Compra una guía (modo simulado) o carga saldo en Clientes."
                        : "Ningún movimiento coincide con los filtros."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTimeMx(row.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">{row.clientName}</TableCell>
                      <TableCell>
                        <Badge variant={row.kind === "SALE" ? "default" : row.kind === "TOP_UP" ? "success" : "outline"}>
                          {billingEventKindLabel(row.kind)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.trackingNumber ?? row.note ?? "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.kind === "SALE" ? formatMxn(row.clientPrice ?? 0) : row.walletAmount != null ? formatMxn(row.walletAmount) : "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.kind === "SALE" ? formatMxn(row.feeAmount ?? 0) : "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.kind === "SALE" ? formatMxn(row.providerCost ?? 0) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-3 p-4 md:hidden">
            {filtered.map((row) => (
              <div key={row.id} className="rounded-lg border border-navy/10 p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{row.clientName}</p>
                  <Badge variant={row.kind === "SALE" ? "default" : "outline"}>
                    {billingEventKindLabel(row.kind)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{formatDateTimeMx(row.createdAt)}</p>
                <p className="mt-1">{row.trackingNumber ?? row.note ?? "—"}</p>
                {row.kind === "SALE" ? (
                  <p className="mt-1 tabular-nums">
                    {formatMxn(row.clientPrice ?? 0)} · comisión {formatMxn(row.feeAmount ?? 0)} ·
                    costo {formatMxn(row.providerCost ?? 0)}
                  </p>
                ) : (
                  <p className="mt-1 font-semibold tabular-nums">{formatMxn(row.walletAmount ?? 0)}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Estado de cuenta</CardTitle>
              <CardDescription>
                Resumen mensual por cliente (zona Mexico City). Marca el mes cuando ya emitiste
                factura interna; no genera CFDI.
              </CardDescription>
            </div>
            {statement ? (
              <Badge variant={statement.status === "FACTURADO" ? "success" : "outline"}>
                {billingPeriodStatusLabel(statement.status)}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ClientTypeahead
              id="stmt-client"
              label="Cliente"
              value={statementClientId}
              allowAll={false}
              placeholder="Busca el cliente del estado de cuenta"
              onChange={setStatementClientId}
              initialSelected={
                clients
                  .filter((client) => client.id === statementClientId)
                  .map((client) => ({
                    id: client.id,
                    companyName: client.companyName,
                    email: "",
                    active: client.active,
                  }))[0] ?? null
              }
            />
            <Field label="Mes" htmlFor="stmt-month">
              <NativeSelect id="stmt-month" value={month} onChange={(e) => setMonth(e.target.value)}>
                {Array.from({ length: 12 }, (_, index) => (
                  <option key={index + 1} value={String(index + 1)}>
                    {formatMxMonthLabel(Number(year) || defaultYear, index + 1).replace(/\s+\d+$/, "")}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Año" htmlFor="stmt-year">
              <Input
                id="stmt-year"
                type="number"
                min={2020}
                max={2100}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </Field>
            <Field label="Nota interna" htmlFor="stmt-note">
              <Input
                id="stmt-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Folio interno, SPEI…"
                maxLength={200}
              />
            </Field>
          </div>

          {!statement || !statementClient ? (
            <p className="text-sm text-muted-foreground">Crea un cliente para ver su estado de cuenta.</p>
          ) : (
            <>
              <p className="text-sm">
                <span className="font-medium text-navy">{statement.clientName}</span>
                {" · "}
                {formatMxMonthLabel(statement.year, statement.month)}
                {" · "}
                {statement.from} a {statement.to}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <MiniStat label="Guías del mes" value={String(statement.totals.salesCount)} hint="Ventas" />
                <MiniStat label="Precio cliente" value={formatMxn(statement.totals.clientPrice)} hint="Cargo a saldo" />
                <MiniStat label="Comisión" value={formatMxn(statement.totals.fee)} hint="Margen" />
                <MiniStat label="Costo Envía" value={formatMxn(statement.totals.providerCost)} hint="Admin" />
                <MiniStat label="Cargas" value={formatMxn(statement.totals.topUp)} hint="Saldo ingresado" />
                <MiniStat
                  label="Saldo actual"
                  value={formatMxn(statement.balanceMxn)}
                  hint={statementClient.active ? "Wallet" : "Cliente inactivo"}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || statement.status === "FACTURADO"}
                  onClick={() => onMark("FACTURADO")}
                >
                  Marcar mes como facturado
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy || statement.status === "OPEN"}
                  onClick={() => onMark("OPEN")}
                >
                  Reabrir periodo
                </Button>
              </div>
            </>
          )}

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-md border border-lima/40 bg-lima/15 px-3 py-2 text-sm text-navy">{message}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-semibold tabular-nums text-navy">{value}</p>
        <p className="type-caption text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
