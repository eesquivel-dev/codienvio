"use server";

import { requireClient } from "@/lib/auth";
import { errorToResponse } from "@/lib/errors";
import { createQuote, purchaseFromQuote } from "@/lib/services/shipping";
import { quoteRequestSchema } from "@/lib/validations";

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
    return { ok: true as const, shipment };
  } catch (error) {
    const { body } = errorToResponse(error);
    return { ok: false as const, error: body.error.message };
  }
}
