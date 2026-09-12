import { NextResponse } from "next/server";
import { requireApiClient } from "@/lib/api-auth";
import { errorToResponse } from "@/lib/errors";
import { createQuote } from "@/lib/services/shipping";

export async function POST(request: Request) {
  try {
    const client = await requireApiClient();
    const body = await request.json();
    const quote = await createQuote(client.id, body);
    return NextResponse.json(quote);
  } catch (error) {
    const { status, body } = errorToResponse(error);
    return NextResponse.json(body, { status });
  }
}
