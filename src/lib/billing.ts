import { asMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const MX_TIME_ZONE = "America/Mexico_City";

export type BillingEventKind = "SALE" | "TOP_UP" | "ADJUSTMENT";

export type BillingEvent = {
  id: string;
  kind: BillingEventKind;
  clientId: string;
  clientName: string;
  createdAt: string;
  clientPrice: number | null;
  feeAmount: number | null;
  providerCost: number | null;
  shipmentId: string | null;
  trackingNumber: string | null;
  walletAmount: number | null;
  note: string | null;
};

export type BillingTotals = {
  salesCount: number;
  clientPrice: number;
  fee: number;
  providerCost: number;
  topUp: number;
  adjustment: number;
};

export type BillingPeriodKey = {
  year: number;
  month: number;
  from: string;
  to: string;
};

export type BillingFilters = {
  clientId?: string | null;
  from?: string | null;
  to?: string | null;
  kind?: BillingEventKind | "ALL" | null;
};

export type ClientStatement = {
  clientId: string;
  clientName: string;
  year: number;
  month: number;
  from: string;
  to: string;
  status: "OPEN" | "FACTURADO";
  balanceMxn: number;
  totals: BillingTotals;
};

const emptyTotals = (): BillingTotals => ({
  salesCount: 0,
  clientPrice: 0,
  fee: 0,
  providerCost: 0,
  topUp: 0,
  adjustment: 0,
});

export function billingEventKindLabel(kind: BillingEventKind): string {
  if (kind === "SALE") return "Venta (guía)";
  if (kind === "TOP_UP") return "Carga de saldo";
  return "Ajuste";
}

export function billingPeriodStatusLabel(status: "OPEN" | "FACTURADO"): string {
  return status === "FACTURADO" ? "Facturado" : "Abierto";
}

export function formatMxMonthLabel(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month - 1, 1));
  const label = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Calendar date `YYYY-MM-DD` in America/Mexico_City. */
export function toMxDateString(value: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MX_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function mxCalendarMonth(date: Date = new Date()): BillingPeriodKey {
  const day = toMxDateString(date);
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));
  return billingPeriodKey(year, month);
}

export function billingPeriodKey(year: number, month: number): BillingPeriodKey {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Periodo inválido");
  }
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  return {
    year,
    month,
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function filterBillingEvents(events: BillingEvent[], filters: BillingFilters = {}): BillingEvent[] {
  const clientId = filters.clientId?.trim() || null;
  const from = filters.from?.trim() || null;
  const to = filters.to?.trim() || null;
  const kind = !filters.kind || filters.kind === "ALL" ? null : filters.kind;

  return events.filter((event) => {
    if (clientId && event.clientId !== clientId) return false;
    if (kind && event.kind !== kind) return false;
    const day = toMxDateString(event.createdAt);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  });
}

/**
 * Admin-only totals. Sale rows own clientPrice / fee / providerCost.
 * Wallet TOP_UP and ADJUSTMENT are cash movements, not double-counted as sales.
 */
export function sumBillingTotals(events: BillingEvent[]): BillingTotals {
  return events.reduce((acc, event) => {
    if (event.kind === "SALE") {
      acc.salesCount += 1;
      acc.clientPrice = asMoney(acc.clientPrice + (event.clientPrice ?? 0));
      acc.fee = asMoney(acc.fee + (event.feeAmount ?? 0));
      acc.providerCost = asMoney(acc.providerCost + (event.providerCost ?? 0));
      return acc;
    }
    if (event.kind === "TOP_UP") {
      acc.topUp = asMoney(acc.topUp + (event.walletAmount ?? 0));
      return acc;
    }
    acc.adjustment = asMoney(acc.adjustment + (event.walletAmount ?? 0));
    return acc;
  }, emptyTotals());
}

export function buildClientStatement(params: {
  clientId: string;
  clientName: string;
  balanceMxn: number;
  year: number;
  month: number;
  status: "OPEN" | "FACTURADO";
  events: BillingEvent[];
}): ClientStatement {
  const period = billingPeriodKey(params.year, params.month);
  const scoped = filterBillingEvents(params.events, {
    clientId: params.clientId,
    from: period.from,
    to: period.to,
  });
  return {
    clientId: params.clientId,
    clientName: params.clientName,
    year: period.year,
    month: period.month,
    from: period.from,
    to: period.to,
    status: params.status,
    balanceMxn: asMoney(params.balanceMxn),
    totals: sumBillingTotals(scoped),
  };
}

export async function listAdminBillingData(): Promise<{
  events: BillingEvent[];
  clients: Array<{ id: string; companyName: string; balanceMxn: number; active: boolean }>;
  periods: Array<{
    clientId: string;
    year: number;
    month: number;
    status: "OPEN" | "FACTURADO";
    note: string | null;
  }>;
}> {
  const [sales, walletTxns, clients, periods] = await Promise.all([
    prisma.sale.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        client: { select: { companyName: true } },
        shipment: { select: { id: true, trackingNumber: true } },
      },
    }),
    prisma.walletTransaction.findMany({
      where: { type: { in: ["TOP_UP", "PURCHASE", "ADJUSTMENT"] } },
      orderBy: { createdAt: "desc" },
      take: 800,
      include: {
        client: { select: { companyName: true } },
        shipment: { select: { trackingNumber: true } },
      },
    }),
    prisma.client.findMany({
      orderBy: { companyName: "asc" },
      select: { id: true, companyName: true, balanceMxn: true, active: true },
    }),
    prisma.billingPeriod.findMany({
      select: { clientId: true, year: true, month: true, status: true, note: true },
    }),
  ]);

  const saleShipmentIds = new Set(sales.map((sale) => sale.shipmentId));
  const saleEvents = sales.map(
    (sale): BillingEvent => ({
      id: `sale:${sale.id}`,
      kind: "SALE",
      clientId: sale.clientId,
      clientName: sale.client.companyName,
      createdAt: sale.createdAt.toISOString(),
      clientPrice: asMoney(sale.clientPrice),
      feeAmount: asMoney(sale.feeAmount),
      providerCost: asMoney(sale.providerCost),
      shipmentId: sale.shipmentId,
      trackingNumber: sale.shipment.trackingNumber,
      walletAmount: -asMoney(sale.clientPrice),
      note: sale.shipment.trackingNumber ? `Guía ${sale.shipment.trackingNumber}` : "Compra de guía",
    }),
  );

  const walletEvents = walletTxns
    .filter((row) => {
      if (row.type === "PURCHASE") {
        return !row.shipmentId || !saleShipmentIds.has(row.shipmentId);
      }
      return true;
    })
    .map((row): BillingEvent => {
      const kind: BillingEventKind = row.type === "TOP_UP" ? "TOP_UP" : row.type === "PURCHASE" ? "SALE" : "ADJUSTMENT";
      return {
        id: `wallet:${row.id}`,
        kind,
        clientId: row.clientId,
        clientName: row.client.companyName,
        createdAt: row.createdAt.toISOString(),
        clientPrice: kind === "SALE" ? asMoney(Math.abs(Number(row.amountMxn))) : null,
        feeAmount: null,
        providerCost: null,
        shipmentId: row.shipmentId,
        trackingNumber: row.shipment?.trackingNumber ?? null,
        walletAmount: asMoney(row.amountMxn),
        note: row.note,
      };
    });

  const events = [...saleEvents, ...walletEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    events,
    clients: clients.map((client) => ({
      id: client.id,
      companyName: client.companyName,
      balanceMxn: asMoney(client.balanceMxn),
      active: client.active,
    })),
    periods,
  };
}
