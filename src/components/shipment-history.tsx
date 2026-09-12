"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { NativeSelect } from "@/components/native-select";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { carrierLabel, formatDateTimeMx } from "@/lib/format";
import { formatMxn } from "@/lib/money";

export type HistoryShipment = {
  id: string;
  status: string;
  carrier: string;
  serviceName: string | null;
  trackingNumber: string | null;
  price: number;
  createdAt: string;
};

export function ShipmentHistory({ shipments }: { shipments: HistoryShipment[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [carrier, setCarrier] = useState("all");

  const carriers = useMemo(
    () => [...new Set(shipments.map((item) => item.carrier))].sort(),
    [shipments],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shipments.filter((item) => {
      if (status !== "all" && item.status !== status) return false;
      if (carrier !== "all" && item.carrier !== carrier) return false;
      if (!q) return true;
      const haystack = [item.trackingNumber, item.carrier, item.serviceName, item.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [shipments, query, status, carrier]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          placeholder="Buscar rastreo, paquetería o ID"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="PURCHASED">Compradas</option>
          <option value="FAILED">Fallidas</option>
        </NativeSelect>
        <NativeSelect value={carrier} onChange={(e) => setCarrier(e.target.value)}>
          <option value="all">Todas las paqueterías</option>
          {carriers.map((code) => (
            <option key={code} value={code}>
              {carrierLabel(code)}
            </option>
          ))}
        </NativeSelect>
      </div>

      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Paquetería</TableHead>
                <TableHead>Rastreo</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    {shipments.length === 0 ? (
                      <>
                        Todavía no compras una guía.{" "}
                        <Link className="underline" href="/portal">
                          Cotizar ahora
                        </Link>
                      </>
                    ) : (
                      "Ningún envío coincide con los filtros."
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link className="font-medium hover:underline" href={`/portal/envios/${item.id}`}>
                        {formatDateTimeMx(item.createdAt)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>{carrierLabel(item.carrier)}</div>
                      <div className="text-xs text-muted-foreground">{item.serviceName}</div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.trackingNumber ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">{formatMxn(item.price)}</TableCell>
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
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              {shipments.length === 0 ? (
                <>
                  Todavía no compras una guía.{" "}
                  <Link className="underline" href="/portal">
                    Cotizar ahora
                  </Link>
                </>
              ) : (
                "Ningún envío coincide con los filtros."
              )}
            </CardContent>
          </Card>
        ) : (
          filtered.map((item) => (
            <Link key={item.id} href={`/portal/envios/${item.id}`} className="block">
              <Card>
                <CardContent className="space-y-2 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{carrierLabel(item.carrier)}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTimeMx(item.createdAt)}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="font-mono text-sm">{item.trackingNumber ?? "Sin rastreo"}</p>
                  <p className="text-sm font-semibold tabular-nums">{formatMxn(item.price)}</p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
