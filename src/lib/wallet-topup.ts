import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import {
  assertMercadoPagoConfigured,
  assertMercadoPagoPublicKey,
  createCheckoutPreference,
  createMercadoPagoPayment,
  fetchMercadoPagoPayment,
  metadataString,
  parseBrickFormData,
  type MercadoPagoPayment,
} from "@/lib/mercadopago";
import { asMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { walletTopUpSchema } from "@/lib/validations";
import { topUpEstadoFromPaymentStatus } from "@/lib/wallet-copy";

export { topUpEstadoFromPaymentStatus };

export type CreditTopUpResult = {
  credited: boolean;
  alreadyCredited: boolean;
  balanceMxn: number;
  amountMxn: number;
  paymentId: string;
};

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002",
  );
}

export function parseTopUpAmountMxn(amountMxn: unknown): number {
  const parsed = walletTopUpSchema.parse({ amountMxn });
  return asMoney(parsed.amountMxn);
}

export function assertApprovedTopUpPayment(
  payment: MercadoPagoPayment,
  expected: { clientId: string; amountMxn: number },
): void {
  if (payment.status !== "approved") {
    throw new AppError("El pago aún no está aprobado.", 409, "PAYMENT_NOT_APPROVED", {
      status: payment.status,
    });
  }
  if (payment.currency_id !== "MXN") {
    throw new AppError("Solo se aceptan recargas en MXN.", 400, "INVALID_CURRENCY");
  }
  const paid = asMoney(payment.transaction_amount);
  if (paid !== asMoney(expected.amountMxn)) {
    throw new AppError("El monto del pago no coincide con la recarga.", 400, "AMOUNT_MISMATCH", {
      paid,
      expected: asMoney(expected.amountMxn),
    });
  }
  const metaClientId = metadataString(payment.metadata, "client_id");
  if (metaClientId && metaClientId !== expected.clientId) {
    throw new AppError("El pago no corresponde a este cliente.", 400, "CLIENT_MISMATCH");
  }
}

export async function createWalletTopUpIntent(params: {
  clientId: string;
  amountMxn: number;
}): Promise<{ topUpId: string; amountMxn: number }> {
  assertMercadoPagoConfigured();
  assertMercadoPagoPublicKey();
  const amount = parseTopUpAmountMxn(params.amountMxn);
  const client = await prisma.client.findUnique({
    where: { id: params.clientId },
    select: { id: true, active: true },
  });
  if (!client) {
    throw new AppError("Cliente no encontrado", 404, "CLIENT_NOT_FOUND");
  }
  if (!client.active) {
    throw new AppError("La cuenta está inactiva. Pide ayuda a tu administrador.", 403, "CLIENT_INACTIVE");
  }

  const topUp = await prisma.walletTopUp.create({
    data: {
      clientId: client.id,
      amountMxn: amount,
      status: "PENDING",
    },
  });
  return { topUpId: topUp.id, amountMxn: amount };
}

export async function createWalletTopUpCheckout(
  params: {
    clientId: string;
    amountMxn: number;
    payerEmail?: string | null;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<{ topUpId: string; checkoutUrl: string }> {
  const amount = parseTopUpAmountMxn(params.amountMxn);
  const client = await prisma.client.findUnique({
    where: { id: params.clientId },
    include: { user: { select: { email: true } } },
  });
  if (!client) {
    throw new AppError("Cliente no encontrado", 404, "CLIENT_NOT_FOUND");
  }
  if (!client.active) {
    throw new AppError("La cuenta está inactiva. Pide ayuda a tu administrador.", 403, "CLIENT_INACTIVE");
  }

  const topUp = await prisma.walletTopUp.create({
    data: {
      clientId: client.id,
      amountMxn: amount,
      status: "PENDING",
    },
  });

  try {
    const preference = await createCheckoutPreference(
      {
        topUpId: topUp.id,
        clientId: client.id,
        amountMxn: amount,
        payerEmail: params.payerEmail || client.user.email,
      },
      fetchImpl,
    );
    await prisma.walletTopUp.update({
      where: { id: topUp.id },
      data: { preferenceId: preference.id },
    });
    return { topUpId: topUp.id, checkoutUrl: preference.checkoutUrl };
  } catch (error) {
    await prisma.walletTopUp.update({
      where: { id: topUp.id },
      data: { status: "FAILED" },
    });
    throw error;
  }
}

export async function processWalletTopUpPayment(
  params: {
    clientId: string;
    topUpId: string;
    formData: unknown;
    payerEmail?: string | null;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<CreditTopUpResult & { paymentStatus: string }> {
  const parsedForm = parseBrickFormData(params.formData);
  const topUp = await prisma.walletTopUp.findUnique({ where: { id: params.topUpId } });
  if (!topUp || topUp.clientId !== params.clientId) {
    throw new AppError("No se encontró la recarga asociada al pago.", 404, "TOP_UP_NOT_FOUND");
  }
  if (topUp.status === "FAILED") {
    throw new AppError("Esta recarga ya no está disponible. Elige el monto de nuevo.", 409, "TOP_UP_FAILED");
  }

  if (topUp.mercadopagoPaymentId) {
    return applyMercadoPagoPayment(topUp.mercadopagoPaymentId, fetchImpl);
  }

  const payment = await createMercadoPagoPayment(
    {
      topUpId: topUp.id,
      clientId: topUp.clientId,
      amountMxn: asMoney(topUp.amountMxn),
      formData: parsedForm,
      payerEmail: params.payerEmail,
    },
    fetchImpl,
  );

  await prisma.walletTopUp.update({
    where: { id: topUp.id },
    data: { mercadopagoPaymentId: payment.id },
  });

  return applyMercadoPagoPayment(payment.id, fetchImpl);
}


/**
 * Credit prepaid saldo exactly once for an approved Mercado Pago payment.
 * Unique mercadopagoPaymentId on the ledger row is the idempotency key.
 */
export async function creditApprovedMercadoPagoTopUp(params: {
  clientId: string;
  amountMxn: number;
  paymentId: string;
  topUpId: string;
}): Promise<CreditTopUpResult> {
  const amount = asMoney(params.amountMxn);
  const paymentId = params.paymentId.trim();
  if (!paymentId) {
    throw new AppError("Falta el identificador del pago.", 400, "PAYMENT_ID_REQUIRED");
  }
  if (amount <= 0) {
    throw new AppError("El monto debe ser mayor a 0", 400, "INVALID_AMOUNT");
  }

  const existing = await prisma.walletTransaction.findUnique({
    where: { mercadopagoPaymentId: paymentId },
    select: { id: true, clientId: true },
  });
  if (existing) {
    const client = await prisma.client.findUnique({
      where: { id: existing.clientId },
      select: { balanceMxn: true },
    });
    return {
      credited: false,
      alreadyCredited: true,
      balanceMxn: asMoney(client?.balanceMxn ?? 0),
      amountMxn: amount,
      paymentId,
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const txn = await tx.walletTransaction.create({
        data: {
          clientId: params.clientId,
          amountMxn: amount,
          type: "TOP_UP",
          note: "Recarga con Mercado Pago",
          mercadopagoPaymentId: paymentId,
        },
      });
      const updated = await tx.client.update({
        where: { id: params.clientId },
        data: { balanceMxn: { increment: amount } },
        select: { balanceMxn: true },
      });
      await tx.walletTopUp.update({
        where: { id: params.topUpId },
        data: {
          status: "APPROVED",
          mercadopagoPaymentId: paymentId,
          walletTxnId: txn.id,
        },
      });
      return asMoney(updated.balanceMxn);
    });

    revalidatePortalWallet();
    return {
      credited: true,
      alreadyCredited: false,
      balanceMxn: result,
      amountMxn: amount,
      paymentId,
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      const client = await prisma.client.findUnique({
        where: { id: params.clientId },
        select: { balanceMxn: true },
      });
      return {
        credited: false,
        alreadyCredited: true,
        balanceMxn: asMoney(client?.balanceMxn ?? 0),
        amountMxn: amount,
        paymentId,
      };
    }
    throw error;
  }
}

export async function applyMercadoPagoPayment(
  paymentId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CreditTopUpResult & { paymentStatus: string }> {
  const payment = await fetchMercadoPagoPayment(paymentId, fetchImpl);
  const topUpId =
    payment.external_reference?.trim() || metadataString(payment.metadata, "top_up_id") || "";

  if (payment.status !== "approved") {
    if (topUpId && ["rejected", "cancelled", "refunded"].includes(payment.status)) {
      await prisma.walletTopUp.updateMany({
        where: { id: topUpId, status: "PENDING" },
        data: { status: "FAILED", mercadopagoPaymentId: payment.id },
      });
    }
    return {
      credited: false,
      alreadyCredited: false,
      balanceMxn: 0,
      amountMxn: asMoney(payment.transaction_amount),
      paymentId: payment.id,
      paymentStatus: payment.status,
    };
  }

  if (!topUpId) {
    throw new AppError("El pago no incluye la referencia de recarga.", 400, "TOP_UP_REFERENCE_MISSING");
  }

  const topUp = await prisma.walletTopUp.findUnique({ where: { id: topUpId } });
  if (!topUp) {
    throw new AppError("No se encontró la recarga asociada al pago.", 404, "TOP_UP_NOT_FOUND");
  }

  assertApprovedTopUpPayment(payment, {
    clientId: topUp.clientId,
    amountMxn: asMoney(topUp.amountMxn),
  });

  const credited = await creditApprovedMercadoPagoTopUp({
    clientId: topUp.clientId,
    amountMxn: asMoney(topUp.amountMxn),
    paymentId: payment.id,
    topUpId: topUp.id,
  });
  return { ...credited, paymentStatus: payment.status };
}

function revalidatePortalWallet() {
  try {
    revalidatePath("/portal");
    revalidatePath("/portal/saldo");
    revalidatePath("/admin/clientes");
    revalidatePath("/admin/facturacion");
  } catch {
    // revalidatePath is a no-op outside a Next.js request (unit tests).
  }
}
