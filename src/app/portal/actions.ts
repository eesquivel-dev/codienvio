"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth";
import { errorToResponse } from "@/lib/errors";
import { createQuote, purchaseFromQuote } from "@/lib/services/shipping";
import { quoteRequestSchema } from "@/lib/validations";
import { getClientWallet } from "@/lib/wallet";
import { createWalletTopUpCheckout } from "@/lib/wallet-topup";

export async function quoteAction(input: unknown) {
  try {
    const session = await requireClient();
    const parsed = quoteRequestSchema.parse(input);
    const quote = await createQuote(session.user.clientId!, parsed);
    return { ok: true as const, quote };
  } catch (error) {
    const { body } = errorToResponse(error);
    return { ok: false as const, error: body.error.message, details: body.error.details };
  }
}

export async function buyAction(quoteId: string, rateId: string) {
  try {
    const session = await requireClient();
    const shipment = await purchaseFromQuote(session.user.clientId!, quoteId, rateId);
    const wallet = await getClientWallet(session.user.clientId!);
    revalidatePath("/portal");
    revalidatePath("/admin/clientes");
    return { ok: true as const, shipment, balanceMxn: wallet.balanceMxn };
  } catch (error) {
    const { body } = errorToResponse(error);
    return { ok: false as const, error: body.error.message };
  }
}

export async function startWalletTopUpAction(amountMxn: number) {
  try {
    const session = await requireClient();
    const checkout = await createWalletTopUpCheckout({
      clientId: session.user.clientId!,
      amountMxn,
      payerEmail: session.user.email,
    });
    return { ok: true as const, checkoutUrl: checkout.checkoutUrl };
  } catch (error) {
    const { body } = errorToResponse(error);
    return { ok: false as const, error: body.error.message };
  }
}
