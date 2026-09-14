"use client";

import { useMemo, useState } from "react";
import { BreakdownBars } from "@/components/breakdown-bars";
import { ExportCsvButton } from "@/components/export-csv-button";
import { ClientTypeahead } from "@/components/client-typeahead";
import { Field } from "@/components/field";
import { DateRangeFields, ListFilters } from "@/components/list-filters";
import { NativeSelect } from "@/components/native-select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { carrierLabel, formatDateTimeMx } from "@/lib/format";
import { formatMxn } from "@/lib/money";
import {
  filterReportFacts,
  groupReportByCarrier,
  groupReportByClient,
  groupReportByDay,
  reportBreakdownToCsv,
  reportFactKindLabel,
  reportFactsToCsv,
  sumReportTotals,
  type ReportFact,
  type ReportFactKind,
} from "@/lib/reports";

export function ReportsConsole({
  facts,
  clients,
  carriers,
  defaultFrom,
  defaultTo,
  initialFrom,
  initialTo,
  initialKind,
  initialClientId,
  initialCarrier,
}: {
  facts: ReportFact[];
  clients: Array<{ id: string; companyName: string; active: boolean }>;
  carriers: string[];
  defaultFrom: string;
  defaultTo: string;
  initialFrom?: string;
  initialTo?: string;
  initialKind?: string;
  initialClientId?: string;
  initialCarrier?: string;
}) {
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState(initialClientId?.trim() ?? "");
  const [carrier, setCarrier] = useState(initialCarrier?.trim() ?? "");
  const [kind, setKind] = useState<ReportFactKind | "ALL">(
    initialKind === "SALE" ||
      initialKind === "FAILED_SHIPMENT" ||
      initialKind === "TOP_UP" ||
      initialKind === "ADJUSTMENT"
      ? initialKind
      : "ALL",
  );
  const [from, setFrom] = useState(initialFrom?.trim() || defaultFrom);
  const [to, setTo] = useState(initialTo?.trim() || defaultTo);

  const filtered = useMemo(
    () => filterReportFacts(facts, { query, clientId, carrier, kind, from, to }),
    [facts, query, clientId, carrier, kind, from, to],
  );
  const totals = useMemo(() => sumReportTotals(filtered), [filtered]);
  const byClient = useMemo(() => groupReportByClient(filtered), [filtered]);
  const byCarrier = useMemo(() => groupReportByCarrier(filtered), [filtered]);
  const byDay = useMemo(() => groupReportByDay(filtered), [filtered]);

  const hasActiveFilters = Boolean(
    query.trim() || clientId || carrier || kind !== "ALL" || from !== defaultFrom || to !== defaultTo,
  );

  function clearFilters() {
    setQuery("");
    setClientId("");
    setCarrier("");
    setKind("ALL");
    setFrom(defaultFrom);
    setTo(defaultTo);
  }

  return (
    <div className="space-y-6">
      <ListFilters
        query={query}
        onQueryChange={setQuery}
        placeholder="Buscar cliente, rastreo, paquetería o nota"
        resultCount={filtered.length}
        totalCount={facts.length}
        noun="movimientos"
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
      >
        <ClientTypeahead
          id="report-client"
          value={clientId}
          onChange={setClientId}
          initialSelected={
            clients
              .filter((client) => client.id === clientId)
              .map((client) => ({
                id: client.id,
                companyName: client.companyName,
                email: "",
                active: client.active,
              }))[0] ?? null
          }
        />
        <Field label="Paquetería" htmlFor="report-carrier">
          <NativeSelect id="report-carrier" value={carrier} onChange={(event) => setCarrier(event.target.value)}>
            <option value="">Todas</option>
            {carriers.map((code) => (
              <option key={code} value={code}>
                {carrierLabel(code)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Tipo" htmlFor="report-kind">
          <NativeSelect
            id="report-kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as ReportFactKind | "ALL")}
          >
            <option value="ALL">Todos</option>
            <option value="SALE">Ventas</option>
            <option value="FAILED_SHIPMENT">Envíos fallidos</option>
            <option value="TOP_UP">Recargas</option>
            <option value="ADJUSTMENT">Ajustes</option>
          </NativeSelect>
        </Field>
        <DateRangeFields
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          fromId="report-from"
          toId="report-to"
        />
      </ListFilters>

      <div className="flex flex-wrap gap-2">
        <ExportCsvButton
          filename="codienvio-reportes-detalle.csv"
          csv={reportFactsToCsv(filtered)}
          label="Exportar detalle"
          disabled={filtered.length === 0}
        />
        <ExportCsvButton
          filename="codienvio-reportes-clientes.csv"
          csv={reportBreakdownToCsv(byClient)}
          label="CSV por cliente"
          disabled={byClient.length === 0}
        />
        <ExportCsvButton
          filename="codienvio-reportes-paqueterias.csv"
          csv={reportBreakdownToCsv(byCarrier)}
          label="CSV por paquetería"
          disabled={byCarrier.length === 0}
        />
        <ExportCsvButton
          filename="codienvio-reportes-dias.csv"
          csv={reportBreakdownToCsv(byDay)}
          label="CSV por día"
          disabled={byDay.length === 0}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Ventas" value={String(totals.salesCount)} hint={`Precio ${formatMxn(totals.clientPrice)}`} />
        <MiniStat label="Margen" value={formatMxn(totals.fee)} hint={`Costo Envía ${formatMxn(totals.providerCost)}`} />
        <MiniStat
          label="Recargas"
          value={formatMxn(totals.topUp)}
          hint={`${totals.topUpCount} cargas${totals.adjustment ? ` · ajustes ${formatMxn(totals.adjustment)}` : ""}`}
        />
        <MiniStat
          label="Envíos"
          value={String(totals.shipmentCount)}
          hint={totals.failedCount ? `${totals.failedCount} fallidos` : "Sin fallos"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Por cliente</CardTitle>
            <CardDescription>Ingreso, comisión y recargas del filtro actual.</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownBars rows={byClient} empty="Ningún cliente coincide con los filtros." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Por paquetería</CardTitle>
            <CardDescription>Solo hechos con carrier (ventas y fallos).</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownBars rows={byCarrier} empty="Ninguna paquetería coincide con los filtros." />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Por día</CardTitle>
          <CardDescription>Totales diarios en zona America/Mexico_City.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Ventas</TableHead>
                  <TableHead>Precio cliente</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead>Costo Envía</TableHead>
                  <TableHead>Recargas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byDay.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      Sin movimientos en el rango.
                    </TableCell>
                  </TableRow>
                ) : (
                  byDay.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className="tabular-nums">{row.salesCount}</TableCell>
                      <TableCell className="tabular-nums">{formatMxn(row.clientPrice)}</TableCell>
                      <TableCell className="tabular-nums">{formatMxn(row.fee)}</TableCell>
                      <TableCell className="tabular-nums">{formatMxn(row.providerCost)}</TableCell>
                      <TableCell className="tabular-nums">{formatMxn(row.topUp)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-3 p-4 md:hidden">
            {byDay.map((row) => (
              <div key={row.key} className="rounded-lg border border-navy/10 p-3 text-sm">
                <p className="font-medium">{row.label}</p>
                <p className="text-muted-foreground">
                  {row.salesCount} ventas · {formatMxn(row.clientPrice)} · margen {formatMxn(row.fee)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalle</CardTitle>
          <CardDescription>Listado filtrado. Una guía comprada aparece como venta, no se duplica con el cargo al saldo.</CardDescription>
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
                      {facts.length === 0
                        ? "Aún no hay ventas ni recargas. Compra una guía (modo simulado) o carga saldo en Clientes."
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
                        <Badge
                          variant={
                            row.kind === "SALE"
                              ? "default"
                              : row.kind === "TOP_UP"
                                ? "success"
                                : row.kind === "FAILED_SHIPMENT"
                                  ? "destructive"
                                  : "outline"
                          }
                        >
                          {reportFactKindLabel(row.kind)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.carrier ? `${carrierLabel(row.carrier)} · ` : ""}
                        {row.trackingNumber ?? row.note ?? "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.kind === "SALE"
                          ? formatMxn(row.clientPrice ?? 0)
                          : row.walletAmount != null
                            ? formatMxn(row.walletAmount)
                            : "—"}
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
                    {reportFactKindLabel(row.kind)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{formatDateTimeMx(row.createdAt)}</p>
                <p className="mt-1">{row.trackingNumber ?? row.note ?? "—"}</p>
              </div>
            ))}
          </div>
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
