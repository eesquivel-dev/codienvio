"use client";

import { useMemo, useState } from "react";
import { NativeSelect } from "@/components/native-select";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  clientName: string;
  clientEmail: string;
  createdAt: string;
};

export function AdminShipmentsTable({ shipments }: { shipments: AdminShipmentRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shipments.filter((item) => {
      if (status !== "all" && item.status !== status) return false;
      if (!q) return true;
      return [item.clientName, item.clientEmail, item.trackingNumber, item.carrier]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [shipments, query, status]);

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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          placeholder="Buscar cliente, correo o rastreo"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="PURCHASED">Compradas</option>
          <option value="FAILED">Fallidas</option>
        </NativeSelect>
      </div>

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
