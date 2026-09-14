import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { errorToResponse } from "@/lib/errors";
import { getClientCatalogById, searchClientCatalog } from "@/lib/client-catalog";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const id = url.searchParams.get("id")?.trim() ?? "";
    const q = url.searchParams.get("q")?.trim() ?? "";

    if (id) {
      const client = await getClientCatalogById(id);
      return NextResponse.json({ client });
    }

    const clients = await searchClientCatalog(q);
    return NextResponse.json({ clients });
  } catch (error) {
    const { status, body } = errorToResponse(error);
    return NextResponse.json(body, { status });
  }
}
