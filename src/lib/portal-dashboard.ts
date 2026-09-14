import { mxCalendarMonth, toMxDateString } from "@/lib/billing";
import { matchesDateRange } from "@/lib/catalog-query";
import { isLowBalance, LOW_BALANCE_MXN } from "@/lib/dashboard";
import { carrierLabel } from "@/lib/format";
import { asMoney } from "@/lib/money";
import { addCalendarDays } from "@/lib/reports";
import {
  listClientPresets,
  type SavedAddressDTO,
  type SavedPackageDTO,
} from "@/lib/saved-presets";
import { listShipments } from "@/lib/services/shipping";
import { getClientWallet } from "@/lib/wallet";

export type ClientDashboardShipment = {
  id: string;
  status: string;
  carrier: string;
  carrierLabel: string;
  serviceName: string | null;
  trackingNumber: string | null;
  price: number;
  createdAt: string;
};

export type ClientDashboardPoint = {
  key: string;
  label: string;
  count: number;
  spend: number;
};

export type ClientDashboardSlice = {
  key: string;
  label: string;
  count: number;
  spend: number;
};

export type ClientDashboard = {
  greetingName: string | null;
  balanceMxn: number;
  lowBalance: boolean;
  lowBalanceThreshold: number;
  purchasedCount: number;
  failedCount: number;
  monthSpend: number;
  monthPurchasedCount: number;
  range: { from: string; to: string };
  recent: ClientDashboardShipment[];
  byDay: ClientDashboardPoint[];
  byCarrier: ClientDashboardSlice[];
  savedAddresses: SavedAddressDTO[];
  savedPackages: SavedPackageDTO[];
};

export async function getClientDashboard(
  clientId: string,
  greetingName?: string | null,
): Promise<ClientDashboard> {
  const month = mxCalendarMonth();
  const [shipments, wallet, presets] = await Promise.all([
    listShipments(clientId),
    getClientWallet(clientId),
    listClientPresets(clientId),
  ]);

  const purchased = shipments.filter((item) => item.status === "PURCHASED");
  const failed = shipments.filter((item) => item.status === "FAILED");
  const monthPurchased = purchased.filter((item) =>
    matchesDateRange(item.createdAt, month.from, month.to),
  );

  const spendByDay = new Map<string, ClientDashboardPoint>();
  for (const item of monthPurchased) {
    const key = toMxDateString(item.createdAt);
    const existing = spendByDay.get(key) ?? { key, label: key, count: 0, spend: 0 };
    existing.count += 1;
    existing.spend = asMoney(existing.spend + item.price);
    spendByDay.set(key, existing);
  }

  const today = toMxDateString(new Date());
  const chartTo = today < month.to ? today : month.to;
  const startCandidate = addCalendarDays(chartTo, -13);
  const chartFrom = startCandidate < month.from ? month.from : startCandidate;
  const byDay: ClientDashboardPoint[] = [];
  let cursor = chartFrom;
  while (cursor <= chartTo) {
    byDay.push(spendByDay.get(cursor) ?? { key: cursor, label: cursor, count: 0, spend: 0 });
    cursor = addCalendarDays(cursor, 1);
  }

  const byCarrierMap = new Map<string, ClientDashboardSlice>();
  for (const item of purchased) {
    const key = item.carrier.toLowerCase();
    const existing =
      byCarrierMap.get(key) ?? { key, label: carrierLabel(item.carrier), count: 0, spend: 0 };
    existing.count += 1;
    existing.spend = asMoney(existing.spend + item.price);
    byCarrierMap.set(key, existing);
  }

  return {
    greetingName: greetingName?.split(" ")[0] ?? null,
    balanceMxn: wallet.balanceMxn,
    lowBalance: isLowBalance(wallet.balanceMxn),
    lowBalanceThreshold: LOW_BALANCE_MXN,
    purchasedCount: purchased.length,
    failedCount: failed.length,
    monthSpend: asMoney(monthPurchased.reduce((sum, item) => sum + item.price, 0)),
    monthPurchasedCount: monthPurchased.length,
    range: { from: month.from, to: month.to },
    recent: purchased.slice(0, 5).map((item) => ({
      id: item.id,
      status: item.status,
      carrier: item.carrier,
      carrierLabel: carrierLabel(item.carrier),
      serviceName: item.serviceName,
      trackingNumber: item.trackingNumber,
      price: item.price,
      createdAt: item.createdAt,
    })),
    byDay,
    byCarrier: [...byCarrierMap.values()].sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"),
    ),
    savedAddresses: presets.addresses,
    savedPackages: presets.packages,
  };
}
