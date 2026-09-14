import { toMxDateString, mxCalendarMonth } from "@/lib/billing";
import { matchesDateRange, matchesQuery } from "@/lib/catalog-query";
import { carrierLabel } from "@/lib/format";
import { asMoney } from "@/lib/money";

export type ReportFactKind = "SALE" | "FAILED_SHIPMENT" | "TOP_UP" | "ADJUSTMENT";

export type ReportPeriodPreset = "today" | "7d" | "month" | "all";

export type ReportFact = {
  id: string;
  kind: ReportFactKind;
  createdAt: string;
  clientId: string;
  clientName: string;
  carrier: string | null;
  trackingNumber: string | null;
  clientPrice: number | null;
  feeAmount: number | null;
  providerCost: number | null;
  walletAmount: number | null;
  note: string | null;
};

export type ReportFilters = {
  query?: string | null;
  clientId?: string | null;
  carrier?: string | null;
  from?: string | null;
  to?: string | null;
  kind?: ReportFactKind | "ALL" | null;
};

export type ReportTotals = {
  salesCount: number;
  purchasedCount: number;
  failedCount: number;
  shipmentCount: number;
  clientPrice: number;
  fee: number;
  providerCost: number;
  topUpCount: number;
  topUp: number;
  adjustment: number;
};

export type ReportBreakdownRow = {
  key: string;
  label: string;
  salesCount: number;
  failedCount: number;
  shipmentCount: number;
  clientPrice: number;
  fee: number;
  providerCost: number;
  topUpCount: number;
  topUp: number;
};

const emptyTotals = (): ReportTotals => ({
  salesCount: 0,
  purchasedCount: 0,
  failedCount: 0,
  shipmentCount: 0,
  clientPrice: 0,
  fee: 0,
  providerCost: 0,
  topUpCount: 0,
  topUp: 0,
  adjustment: 0,
});

export const REPORT_PERIODS: Array<{ value: ReportPeriodPreset; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "7 días" },
  { value: "month", label: "Este mes" },
  { value: "all", label: "Todo" },
];

export function parseReportPeriod(value?: string | null): ReportPeriodPreset {
  if (value === "today" || value === "7d" || value === "month" || value === "all") return value;
  return "month";
}

export function reportFactKindLabel(kind: ReportFactKind): string {
  if (kind === "SALE") return "Venta";
  if (kind === "FAILED_SHIPMENT") return "Envío fallido";
  if (kind === "TOP_UP") return "Recarga de saldo";
  return "Ajuste";
}

/** Add calendar days to a `YYYY-MM-DD` date without timezone drift. */
export function addCalendarDays(ymd: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) throw new Error("Fecha inválida");
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function calendarDayDiff(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error("Fecha inválida");
  return Math.round((end - start) / 86_400_000);
}

export function reportPeriodRange(
  preset: ReportPeriodPreset,
  now: Date = new Date(),
): { from: string | null; to: string | null } {
  const today = toMxDateString(now);
  if (preset === "all") return { from: null, to: null };
  if (preset === "today") return { from: today, to: today };
  if (preset === "month") {
    const month = mxCalendarMonth(now);
    return { from: month.from, to: month.to };
  }
  return { from: addCalendarDays(today, -6), to: today };
}

/** Same-length window immediately before `[from, to]`. */
export function previousPeriodRange(from: string, to: string): { from: string; to: string } {
  const days = calendarDayDiff(from, to) + 1;
  const prevTo = addCalendarDays(from, -1);
  return { from: addCalendarDays(prevTo, -(days - 1)), to: prevTo };
}

/** One-decimal percent change. `null` when the previous value is 0 and current is not. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export function filterReportFacts(facts: ReportFact[], filters: ReportFilters = {}): ReportFact[] {
  const clientId = filters.clientId?.trim() || null;
  const carrier = filters.carrier?.trim() || null;
  const kind = !filters.kind || filters.kind === "ALL" ? null : filters.kind;
  const query = filters.query ?? "";

  return facts.filter((fact) => {
    if (clientId && fact.clientId !== clientId) return false;
    if (carrier && fact.carrier !== carrier) return false;
    if (kind && fact.kind !== kind) return false;
    if (!matchesDateRange(fact.createdAt, filters.from, filters.to)) return false;
    return matchesQuery(
      [fact.clientName, fact.carrier, fact.trackingNumber, fact.note, reportFactKindLabel(fact.kind), fact.id],
      query,
    );
  });
}

export function sumReportTotals(facts: ReportFact[]): ReportTotals {
  return facts.reduce((acc, fact) => {
    if (fact.kind === "SALE") {
      acc.salesCount += 1;
      acc.purchasedCount += 1;
      acc.shipmentCount += 1;
      acc.clientPrice = asMoney(acc.clientPrice + (fact.clientPrice ?? 0));
      acc.fee = asMoney(acc.fee + (fact.feeAmount ?? 0));
      acc.providerCost = asMoney(acc.providerCost + (fact.providerCost ?? 0));
      return acc;
    }
    if (fact.kind === "FAILED_SHIPMENT") {
      acc.failedCount += 1;
      acc.shipmentCount += 1;
      return acc;
    }
    if (fact.kind === "TOP_UP") {
      acc.topUpCount += 1;
      acc.topUp = asMoney(acc.topUp + (fact.walletAmount ?? 0));
      return acc;
    }
    acc.adjustment = asMoney(acc.adjustment + (fact.walletAmount ?? 0));
    return acc;
  }, emptyTotals());
}

function emptyBreakdown(key: string, label: string): ReportBreakdownRow {
  return {
    key,
    label,
    salesCount: 0,
    failedCount: 0,
    shipmentCount: 0,
    clientPrice: 0,
    fee: 0,
    providerCost: 0,
    topUpCount: 0,
    topUp: 0,
  };
}

function addFactToBreakdown(row: ReportBreakdownRow, fact: ReportFact): void {
  if (fact.kind === "SALE") {
    row.salesCount += 1;
    row.shipmentCount += 1;
    row.clientPrice = asMoney(row.clientPrice + (fact.clientPrice ?? 0));
    row.fee = asMoney(row.fee + (fact.feeAmount ?? 0));
    row.providerCost = asMoney(row.providerCost + (fact.providerCost ?? 0));
    return;
  }
  if (fact.kind === "FAILED_SHIPMENT") {
    row.failedCount += 1;
    row.shipmentCount += 1;
    return;
  }
  if (fact.kind === "TOP_UP") {
    row.topUpCount += 1;
    row.topUp = asMoney(row.topUp + (fact.walletAmount ?? 0));
  }
}

function sortBreakdown(rows: ReportBreakdownRow[]): ReportBreakdownRow[] {
  return rows.sort((a, b) => {
    if (b.clientPrice !== a.clientPrice) return b.clientPrice - a.clientPrice;
    if (b.topUp !== a.topUp) return b.topUp - a.topUp;
    return b.salesCount - a.salesCount || a.label.localeCompare(b.label, "es");
  });
}

export function groupReportByClient(facts: ReportFact[]): ReportBreakdownRow[] {
  const map = new Map<string, ReportBreakdownRow>();
  for (const fact of facts) {
    const row = map.get(fact.clientId) ?? emptyBreakdown(fact.clientId, fact.clientName);
    addFactToBreakdown(row, fact);
    map.set(fact.clientId, row);
  }
  return sortBreakdown([...map.values()]);
}

export function groupReportByCarrier(facts: ReportFact[]): ReportBreakdownRow[] {
  const map = new Map<string, ReportBreakdownRow>();
  for (const fact of facts) {
    if (!fact.carrier) continue;
    const key = fact.carrier.toLowerCase();
    const row = map.get(key) ?? emptyBreakdown(key, carrierLabel(fact.carrier));
    addFactToBreakdown(row, fact);
    map.set(key, row);
  }
  return sortBreakdown([...map.values()]);
}

export function groupReportByDay(facts: ReportFact[]): ReportBreakdownRow[] {
  const map = new Map<string, ReportBreakdownRow>();
  for (const fact of facts) {
    const key = toMxDateString(fact.createdAt);
    const row = map.get(key) ?? emptyBreakdown(key, key);
    addFactToBreakdown(row, fact);
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const escape = (value: string | number | null | undefined) => {
    if (value == null) return "";
    const text = String(value);
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  return `${[headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))].join("\r\n")}\r\n`;
}

export function reportFactsToCsv(facts: ReportFact[]): string {
  return toCsv(
    [
      "Fecha",
      "Tipo",
      "Cliente",
      "Paquetería",
      "Rastreo",
      "Precio cliente",
      "Comisión",
      "Costo Envía",
      "Monto saldo",
      "Nota",
    ],
    facts.map((fact) => [
      fact.createdAt,
      reportFactKindLabel(fact.kind),
      fact.clientName,
      fact.carrier ? carrierLabel(fact.carrier) : "",
      fact.trackingNumber,
      fact.clientPrice,
      fact.feeAmount,
      fact.providerCost,
      fact.walletAmount,
      fact.note,
    ]),
  );
}

export function reportBreakdownToCsv(rows: ReportBreakdownRow[]): string {
  return toCsv(
    [
      "Grupo",
      "Ventas",
      "Envíos fallidos",
      "Precio cliente",
      "Comisión",
      "Costo Envía",
      "Recargas",
      "Monto recargas",
    ],
    rows.map((row) => [
      row.label,
      row.salesCount,
      row.failedCount,
      row.clientPrice,
      row.fee,
      row.providerCost,
      row.topUpCount,
      row.topUp,
    ]),
  );
}
