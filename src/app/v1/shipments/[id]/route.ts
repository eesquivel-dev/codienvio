import { NextResponse } from "next/server";
import { requireApiClient } from "@/lib/api-auth";
import { errorToResponse } from "@/lib/errors";
import { getShipment } from "@/lib/services/shipping";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const client = await requireApiClient();
    const { id } = await context.params;
    const shipment = await getShipment(client.id, id);
    return NextResponse.json(shipment);
  } catch (error) {
    const { status, body } = errorToResponse(error);
    return NextResponse.json(body, { status });
  }
}
