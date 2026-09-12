import { NextResponse } from "next/server";
import { requireApiClient } from "@/lib/api-auth";
import { errorToResponse } from "@/lib/errors";
import { purchaseFromQuote } from "@/lib/services/shipping";
import { purchaseFromQuoteSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const client = await requireApiClient();
    const body = purchaseFromQuoteSchema.parse(await request.json());
    const shipment = await purchaseFromQuote(client.id, body.quoteId, body.rateId);
    return NextResponse.json(shipment, { status: 201 });
  } catch (error) {
    const { status, body } = errorToResponse(error);
    return NextResponse.json(body, { status });
  }
}
