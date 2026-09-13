"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/auth";
import { errorToResponse } from "@/lib/errors";
import {
  createSavedAddress,
  createSavedPackage,
  deleteSavedAddress,
  deleteSavedPackage,
  updateSavedAddress,
  updateSavedPackage,
} from "@/lib/saved-presets";
import { createQuote, purchaseFromQuote } from "@/lib/services/shipping";
import {
  quoteRequestSchema,
  savedAddressInputSchema,
  savedAddressUpdateSchema,
  savedPackageInputSchema,
  savedPackageUpdateSchema,
} from "@/lib/validations";
import { getClientWallet } from "@/lib/wallet";
import {
  createWalletTopUpCheckout,
  createWalletTopUpIntent,
  processWalletTopUpPayment,
} from "@/lib/wallet-topup";

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

function revalidatePresets() {
  revalidatePath("/portal");
  revalidatePath("/portal/libreta");
  revalidatePath("/admin/clientes");
}

export async function createSavedAddressAction(input: unknown) {
  try {
    const session = await requireClient();
    const parsed = savedAddressInputSchema.parse(input);
    const address = await createSavedAddress(session.user.clientId!, parsed);
    revalidatePresets();
    return { ok: true as const, address };
  } catch (error) {
    const { body } = errorToResponse(error);
    return { ok: false as const, error: body.error.message };
  }
}

export async function updateSavedAddressAction(input: unknown) {
  try {
    const session = await requireClient();
    const parsed = savedAddressUpdateSchema.parse(input);
    const address = await updateSavedAddress(session.user.clientId!, parsed.id, parsed);
    revalidatePresets();
    return { ok: true as const, address };
  } catch (error) {
    const { body } = errorToResponse(error);
    return { ok: false as const, error: body.error.message };
  }
}

export async function deleteSavedAddressAction(id: string) {
  try {
    const session = await requireClient();
    await deleteSavedAddress(session.user.clientId!, id);
    revalidatePresets();
    return { ok: true as const };
  } catch (error) {
    const { body } = errorToResponse(error);
    return { ok: false as const, error: body.error.message };
  }
}

export async function createSavedPackageAction(input: unknown) {
  try {
    const session = await requireClient();
    const parsed = savedPackageInputSchema.parse(input);
    const item = await createSavedPackage(session.user.clientId!, parsed);
    revalidatePresets();
    return { ok: true as const, package: item };
  } catch (error) {
    const { body } = errorToResponse(error);
    return { ok: false as const, error: body.error.message };
  }
}

export async function updateSavedPackageAction(input: unknown) {
  try {
    const session = await requireClient();
    const parsed = savedPackageUpdateSchema.parse(input);
    const item = await updateSavedPackage(session.user.clientId!, parsed.id, parsed);
    revalidatePresets();
    return { ok: true as const, package: item };
  } catch (error) {
    const { body } = errorToResponse(error);
    return { ok: false as const, error: body.error.message };
  }
}

export async function deleteSavedPackageAction(id: string) {
  try {
    const session = await requireClient();
    await deleteSavedPackage(session.user.clientId!, id);
    revalidatePresets();
    return { ok: true as const };
  } catch (error) {
    const { body } = errorToResponse(error);
    return { ok: false as const, error: body.error.message };
  }
}

export async function startWalletTopUpAction(amountMxn: number) {
  try {
    const session = await requireClient();
    const intent = await createWalletTopUpIntent({
      clientId: session.user.clientId!,
      amountMxn,
    });
    return { ok: true as const, topUpId: intent.topUpId, amountMxn: intent.amountMxn };
  } catch (error) {
    const { body } = errorToResponse(error);
    return { ok: false as const, error: body.error.message };
  }
}

export async function startWalletCheckoutProAction(amountMxn: number) {
  try {
    const session = await requireClient();
    const checkout = await createWalletTopUpCheckout({
      clientId: session.user.clientId!,
      amountMxn,
      payerEmail: session.user.email,
    });
    return { ok: true as const, checkoutUrl: checkout.checkoutUrl, topUpId: checkout.topUpId };
  } catch (error) {
    const { body } = errorToResponse(error);
    return { ok: false as const, error: body.error.message };
  }
}

export async function processWalletTopUpPaymentAction(input: { topUpId: string; formData: unknown }) {
  try {
    const session = await requireClient();
    const result = await processWalletTopUpPayment({
      clientId: session.user.clientId!,
      topUpId: input.topUpId,
      formData: input.formData,
      payerEmail: session.user.email,
    });
    return {
      ok: true as const,
      paymentId: result.paymentId,
      paymentStatus: result.paymentStatus,
      credited: result.credited,
      alreadyCredited: result.alreadyCredited,
      balanceMxn: result.balanceMxn,
      amountMxn: result.amountMxn,
    };
  } catch (error) {
    const { body } = errorToResponse(error);
    return { ok: false as const, error: body.error.message };
  }
}
