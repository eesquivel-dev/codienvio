import { NextResponse } from "next/server";
import { errorToResponse } from "@/lib/errors";
import { getActiveProvider } from "@/lib/settings";

export async function GET(request: Request) {
  try {
    const code = new URL(request.url).searchParams.get("code")?.trim() ?? "";
    if (!/^\d{5}$/.test(code)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "El CP debe tener 5 dígitos" } },
        { status: 422 },
      );
    }
    const provider = await getActiveProvider();
    const data = provider.lookupZip ? await provider.lookupZip(code) : null;
    if (!data) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No se encontró el código postal" } },
        { status: 404 },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    const { status, body } = errorToResponse(error);
    return NextResponse.json(body, { status });
  }
}
