"use client";

import { useMemo, useState } from "react";
import { ClientTypeahead } from "@/components/client-typeahead";
import { Field } from "@/components/field";
import { DateRangeFields, ListFilters } from "@/components/list-filters";
import { NativeSelect } from "@/components/native-select";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { matchesDateRange, matchesQuery } from "@/lib/catalog-query";
import { carrierLabel, formatDateTimeMx } from "@/lib/format";
import { formatMxn } from "@/lib/money";

export type AdminShipmentRow = {
  id: string;
  status: string;
  carrier: string;
  serviceName: string | null;
  trackingNumber: string | null;
  price: number;
  providerCost: number;
  feeAmount: number;
  clientId: string;
  clientName: string;
  clientEmail: string;
  createdAt: string;
};

export function AdminShipmentsTable({
  shipments,
  initialStatus,
  initialFrom,
  initialTo,
  initialClientId,
  initialCarrier,
}: {
  shipments: AdminShipmentRow[];
  initialStatus?: string;
  initialFrom?: string;
  initialTo?: string;
  initialClientId?: string;
  initialCarrier?: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(initialStatus?.trim() || "all");
  const [carrier, setCarrier] = useState(initialCarrier?.trim() || "all");
  const [clientId, setClientId] = useState(initialClientId?.trim() ?? "");
  const [from, setFrom] = useState(initialFrom?.trim() ?? "");
  const [to, setTo] = useState(initialTo?.trim() ?? "");

  const carriers = useMemo(
    () => [...new Set(shipments.map((item) => item.carrier))].sort(),
    [shipments],
  );

  const filtered = useMemo(() => {
    return shipments.filter((item) => {
      if (status !== "all" && item.status !== status) return false;
      if (carrier !== "all" && item.carrier.toLowerCase() !== carrier.toLowerCase()) return false;
      if (clientId && item.clientId !== clientId) return false;
      if (!matchesDateRange(item.createdAt, from, to)) return false;
      return matchesQuery(
        [item.clientName, item.clientEmail, item.trackingNumber, item.carrier, item.serviceName, item.id],
        query,
      );
    });
  }, [shipments, query, status, carrier, clientId, from, to]);

  const totals = filtered.reduce(
    (acc, item) => {
      if (item.status !== "PURCHASED") return acc;
      acc.cost += item.providerCost;
      acc.fee += item.feeAmount;
      acc.price += item.price;
      return acc;
    },
    { cost: 0, fee: 0, price: 0 },
  );

  const hasActiveFilters = Boolean(
    query.trim() || status !== "all" || carrier !== "all" || clientId || from || to,
  );

  return (
    <div className="space-y-4">
      <ListFilters
        query={query}
        onQueryChange={setQuery}
        placeholder="Buscar cliente, correo, rastreo o paquetería"
        resultCount={filtered.length}
        totalCount={shipments.length}
        noun="envíos"
        hasActiveFilters={hasActiveFilters}
        onClear={() => {
          setQuery("");
          setStatus("all");
          setCarrier("all");
          setClientId("");
          setFrom("");
          setTo("");
        }}
      >
        <ClientTypeahead
          id="admin-ship-client"
          value={clientId}
          onChange={setClientId}
          initialSelected={
            initialClientId
              ? shipments
                  .filter((item) => item.clientId === initialClientId)
                  .map((item) => ({
                    id: item.clientId,
                    companyName: item.clientName,
                    email: item.clientEmail,
                  }))[0]
              : null
          }
        />
        <Field label="Estado" htmlFor="admin-ship-status">
          <NativeSelect id="admin-ship-status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="PURCHASED">Compradas</option>
            <option value="FAILED">Fallidas</option>
          </NativeSelect>
        </Field>
        <Field label="Paquetería" htmlFor="admin-ship-carrier">
          <NativeSelect id="admin-ship-carrier" value={carrier} onChange={(event) => setCarrier(event.target.value)}>
            <option value="all">Todas las paqueterías</option>
            {carriers.map((code) => (
              <option key={code} value={code}>
                {carrierLabel(code)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <DateRangeFields from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      </ListFilters>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="Costo Envia" value={formatMxn(totals.cost)} />
        <MiniStat label="Margen" value={formatMxn(totals.fee)} />
        <MiniStat label="Precio cliente" value={formatMxn(totals.price)} />
      </div>

      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Paquetería</TableHead>
                <TableHead>Rastreo</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    {shipments.length === 0 ? "Aún no hay envíos." : "Ningún envío coincide con los filtros."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.clientName}</div>
                      <div className="text-xs text-muted-foreground">{item.clientEmail}</div>
                    </TableCell>
                    <TableCell>
                      {carrierLabel(item.carrier)}
                      <div className="text-xs text-muted-foreground">{item.serviceName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs">{item.trackingNumber ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{formatDateTimeMx(item.createdAt)}</div>
                    </TableCell>
                    <TableCell className="tabular-nums">{formatMxn(item.providerCost)}</TableCell>
                    <TableCell className="tabular-nums">{formatMxn(item.feeAmount)}</TableCell>
                    <TableCell className="font-medium tabular-nums">{formatMxn(item.price)}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="space-y-3 md:hidden">
        {filtered.map((item) => (
          <Card key={item.id}>
            <CardContent className="space-y-2 pt-6 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{item.clientName}</p>
                  <p className="text-xs text-muted-foreground">{item.clientEmail}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <p>
                {carrierLabel(item.carrier)} · {item.trackingNumber ?? "sin rastreo"}
              </p>
              <p className="text-muted-foreground">
                Costo {formatMxn(item.providerCost)} · margen {formatMxn(item.feeAmount)}
              </p>
              <p className="font-semibold tabular-nums">{formatMxn(item.price)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
