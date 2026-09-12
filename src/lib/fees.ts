import { asMoney, fromCents, toCents } from "@/lib/money";

export type FeeRule = {
  percent: number;
  fixedMxn: number;
};

export type PricedAmount = {
  providerCost: number;
  feeAmount: number;
  clientPrice: number;
};

export function normalizeFeeRule(rule: FeeRule): FeeRule {
  const percent = Number(rule.percent);
  const fixedMxn = Number(rule.fixedMxn);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new Error("El porcentaje de comisión debe estar entre 0 y 100");
  }
  if (!Number.isFinite(fixedMxn) || fixedMxn < 0) {
    throw new Error("La comisión fija debe ser mayor o igual a 0");
  }
  return { percent: asMoney(percent), fixedMxn: asMoney(fixedMxn) };
}

/**
 * client_price = provider_cost + percent(provider_cost) + fixed MXN.
 * Clients must only ever see clientPrice.
 */
export function applyFee(providerCost: number, rule: FeeRule): PricedAmount {
  const normalized = normalizeFeeRule(rule);
  const costCents = toCents(providerCost);
  if (costCents < 0) {
    throw new Error("El costo del proveedor no puede ser negativo");
  }
  const percentCents = Math.round((costCents * normalized.percent) / 100);
  const feeCents = percentCents + toCents(normalized.fixedMxn);
  return {
    providerCost: fromCents(costCents),
    feeAmount: fromCents(feeCents),
    clientPrice: fromCents(costCents + feeCents),
  };
}

export function resolveFeeRule(
  defaults: FeeRule,
  override?: { percent: number | null; fixedMxn: number | null },
): FeeRule {
  const percent =
    override?.percent === null || override?.percent === undefined
      ? defaults.percent
      : Number(override.percent);
  const fixedMxn =
    override?.fixedMxn === null || override?.fixedMxn === undefined
      ? defaults.fixedMxn
      : Number(override.fixedMxn);
  return normalizeFeeRule({ percent, fixedMxn });
}

export function stripProviderCost<T extends { providerCost?: unknown; feeAmount?: unknown }>(
  value: T,
): Omit<T, "providerCost" | "feeAmount"> {
  const { providerCost: _cost, feeAmount: _fee, ...rest } = value;
  void _cost;
  void _fee;
  return rest;
}
