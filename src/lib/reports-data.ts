import { LOW_BALANCE_MXN } from "@/lib/dashboard";
import { countLowBalanceClients } from "@/lib/client-catalog";
import { toMxDateString } from "@/lib/billing";
import { asMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import {
  fillDailySeries,
  filterReportFacts,
  groupReportByCarrier,
  groupReportByClient,
  groupReportByDay,
  parseReportPeriod,
  percentChange,
  previousPeriodRange,
  reportPeriodRange,
  sumReportTotals,
  type ReportFact,
  type ReportPeriodPreset,
  type ReportTotals,
} from "@/lib/reports";

function moneyOrNull(value: unknown): number | null {
  if (value == null) return null;
  return asMoney(value as number | string | { toString(): string });
}

export async function listAdminReportFacts(): Promise<ReportFact[]> {
  const [sales, failed, walletTxns] = await Promise.all([
    prisma.sale.findMany({
      orderBy: { createdAt: "desc" },
      take: 2000,
      include: {
        client: { select: { companyName: true } },
        shipment: { select: { carrier: true, trackingNumber: true } },
      },
    }),
    prisma.shipment.findMany({
      where: { status: "FAILED" },
      orderBy: { createdAt: "desc" },
      take: 1000,
      include: { client: { select: { companyName: true } } },
    }),
    prisma.walletTransaction.findMany({
      where: { type: { in: ["TOP_UP", "ADJUSTMENT"] } },
      orderBy: { createdAt: "desc" },
      take: 2000,
      include: { client: { select: { companyName: true } } },
    }),
  ]);

  const saleFacts: ReportFact[] = sales.map((sale) => ({
    id: `sale:${sale.id}`,
    kind: "SALE",
    createdAt: sale.createdAt.toISOString(),
    clientId: sale.clientId,
    clientName: sale.client.companyName,
    carrier: sale.shipment.carrier,
    trackingNumber: sale.shipment.trackingNumber,
    clientPrice: asMoney(sale.clientPrice),
    feeAmount: asMoney(sale.feeAmount),
    providerCost: asMoney(sale.providerCost),
    walletAmount: -asMoney(sale.clientPrice),
    note: sale.shipment.trackingNumber ? `Guía ${sale.shipment.trackingNumber}` : "Compra de guía",
  }));

  const failedFacts: ReportFact[] = failed.map((shipment) => ({
    id: `fail:${shipment.id}`,
    kind: "FAILED_SHIPMENT",
    createdAt: shipment.createdAt.toISOString(),
    clientId: shipment.clientId,
    clientName: shipment.client.companyName,
    carrier: shipment.carrier,
    trackingNumber: shipment.trackingNumber,
    clientPrice: moneyOrNull(shipment.clientPrice),
    feeAmount: moneyOrNull(shipment.feeAmount),
    providerCost: moneyOrNull(shipment.providerCost),
    walletAmount: null,
    note: shipment.errorMessage,
  }));

  const walletFacts: ReportFact[] = walletTxns.map((row) => ({
    id: `wallet:${row.id}`,
    kind: row.type === "TOP_UP" ? "TOP_UP" : "ADJUSTMENT",
    createdAt: row.createdAt.toISOString(),
    clientId: row.clientId,
    clientName: row.client.companyName,
    carrier: null,
    trackingNumber: null,
    clientPrice: null,
    feeAmount: null,
    providerCost: null,
    walletAmount: asMoney(row.amountMxn),
    note: row.note,
  }));

  return [...saleFacts, ...failedFacts, ...walletFacts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listReportFilterOptions(): Promise<{
  clients: Array<{ id: string; companyName: string; active: boolean }>;
  carriers: string[];
}> {
  const [clients, carriers] = await Promise.all([
    prisma.client.findMany({
      orderBy: { companyName: "asc" },
      select: { id: true, companyName: true, active: true },
    }),
    prisma.shipment.findMany({
      distinct: ["carrier"],
      select: { carrier: true },
      orderBy: { carrier: "asc" },
    }),
  ]);
  return {
    clients,
    carriers: carriers.map((row) => row.carrier).filter(Boolean),
  };
}

export type DashboardDelta = {
  current: number;
  previous: number;
  change: number | null;
};

function delta(current: number, previous: number | null): DashboardDelta {
  return {
    current,
    previous: previous ?? 0,
    change: previous == null ? null : percentChange(current, previous),
  };
}

export type OperatorDashboard = {
  period: ReportPeriodPreset;
  range: { from: string | null; to: string | null };
  totals: ReportTotals;
  previous: ReportTotals | null;
  kpis: {
    salesCount: DashboardDelta;
    clientPrice: DashboardDelta;
    fee: DashboardDelta;
    providerCost: DashboardDelta;
    topUp: DashboardDelta;
    failedCount: DashboardDelta;
  };
  byClient: ReturnType<typeof groupReportByClient>;
  byCarrier: ReturnType<typeof groupReportByCarrier>;
  byDay: ReturnType<typeof groupReportByDay>;
  byDaySeries: ReturnType<typeof fillDailySeries>;
  recent: ReportFact[];
  snapshot: {
    activeClients: number;
    clientCount: number;
    walletTotal: number;
    lowBalanceClients: number;
    lowBalanceThreshold: number;
  };
};

export async function getOperatorDashboard(periodInput?: string | null): Promise<OperatorDashboard> {
  const period = parseReportPeriod(periodInput);
  const range = reportPeriodRange(period);
  const [facts, walletAgg, activeClients, clientCount, lowBalanceClients] = await Promise.all([
    listAdminReportFacts(),
    prisma.client.aggregate({ _sum: { balanceMxn: true } }),
    prisma.client.count({ where: { active: true } }),
    prisma.client.count(),
    countLowBalanceClients(),
  ]);

  const currentFacts = filterReportFacts(facts, range);
  const totals = sumReportTotals(currentFacts);
  const prevRange = range.from && range.to ? previousPeriodRange(range.from, range.to) : null;
  const previous = prevRange ? sumReportTotals(filterReportFacts(facts, prevRange)) : null;

  const today = toMxDateString(new Date());
  const chartTo = range.to && range.to > today ? today : range.to;
  const byDay = groupReportByDay(currentFacts);

  return {
    period,
    range,
    totals,
    previous,
    kpis: {
      salesCount: delta(totals.salesCount, previous?.salesCount ?? null),
      clientPrice: delta(totals.clientPrice, previous?.clientPrice ?? null),
      fee: delta(totals.fee, previous?.fee ?? null),
      providerCost: delta(totals.providerCost, previous?.providerCost ?? null),
      topUp: delta(totals.topUp, previous?.topUp ?? null),
      failedCount: delta(totals.failedCount, previous?.failedCount ?? null),
    },
    byClient: groupReportByClient(currentFacts).slice(0, 6),
    byCarrier: groupReportByCarrier(currentFacts).slice(0, 6),
    byDay: byDay.slice(0, 14),
    byDaySeries: fillDailySeries(byDay, range.from, chartTo, 14),
    recent: currentFacts.slice(0, 10),
    snapshot: {
      activeClients,
      clientCount,
      walletTotal: asMoney(walletAgg._sum.balanceMxn ?? 0),
      lowBalanceClients,
      lowBalanceThreshold: LOW_BALANCE_MXN,
    },
  };
}
