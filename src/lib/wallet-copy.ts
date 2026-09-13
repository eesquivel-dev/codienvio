import { AppError } from "@/lib/errors";
import { asMoney, formatMxn } from "@/lib/money";

export type WalletTxnType = "TOP_UP" | "PURCHASE" | "ADJUSTMENT";

export type WalletLedgerRow = {
  id: string;
  type: WalletTxnType;
  amountMxn: number;
  note: string | null;
  shipmentId: string | null;
  createdAt: string;
};

export function canAfford(balanceMxn: number, priceMxn: number): boolean {
  return asMoney(balanceMxn) >= asMoney(priceMxn);
}

export function insufficientBalanceMessage(balanceMxn: number, requiredMxn: number): string {
  return `Saldo insuficiente. Tu saldo es ${formatMxn(balanceMxn)}; esta guía cuesta ${formatMxn(requiredMxn)}.`;
}

export function insufficientBalanceError(balanceMxn: number, requiredMxn: number): AppError {
  return new AppError(insufficientBalanceMessage(balanceMxn, requiredMxn), 402, "INSUFFICIENT_BALANCE", {
    balanceMxn: asMoney(balanceMxn),
    requiredMxn: asMoney(requiredMxn),
  });
}

export function assertSufficientBalance(balanceMxn: number, requiredMxn: number): void {
  const balance = asMoney(balanceMxn);
  const required = asMoney(requiredMxn);
  if (!canAfford(balance, required)) {
    throw insufficientBalanceError(balance, required);
  }
}

export function walletTxnTypeLabel(type: WalletTxnType): string {
  if (type === "TOP_UP") return "Carga";
  if (type === "PURCHASE") return "Compra de guía";
  return "Ajuste";
}

export function topUpEstadoFromPaymentStatus(status: string): "aprobado" | "rechazado" | "pendiente" {
  if (status === "approved") return "aprobado";
  if (["rejected", "cancelled", "refunded"].includes(status)) return "rechazado";
  return "pendiente";
}

export type WalletCheckoutPath = "brick" | "checkout_pro";

export const BRICK_AUTOFILL_HINT =
  "Si el navegador o el administrador de contraseñas completa el número de tarjeta, escribe la fecha de vencimiento y el código de seguridad (CVV) a mano. Mercado Pago protege esos campos en un formulario seguro y no puede recibirlos del autocompletado.";

export function walletCheckoutPathLabel(path: WalletCheckoutPath): string {
  return path === "brick" ? "Pagar aquí" : "Pagar con Mercado Pago";
}
