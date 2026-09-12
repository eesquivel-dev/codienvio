/** Money helpers. All amounts are MXN with 2 decimal places. */

export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new Error("Monto inválido");
  }
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

export function asMoney(value: number | string | { toString(): string }): number {
  const n = typeof value === "number" ? value : Number(value.toString());
  if (!Number.isFinite(n)) {
    throw new Error("Monto inválido");
  }
  return fromCents(toCents(n));
}

export function formatMxn(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(asMoney(amount));
}
