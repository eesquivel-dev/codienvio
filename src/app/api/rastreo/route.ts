import { NextResponse } from "next/server";
import { errorToResponse } from "@/lib/errors";
import { lookupPublicTracking } from "@/lib/tracking-data";

function guiaFrom(request: Request, body?: { guia?: unknown }): string {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("guia") ?? url.searchParams.get("tracking");
  if (fromQuery) return fromQuery;
  if (typeof body?.guia === "string") return body.guia;
  return "";
}

export async function GET(request: Request) {
  return respond(request);
}

export async function POST(request: Request) {
  let body: { guia?: unknown } = {};
  try {
    body = (await request.json()) as { guia?: unknown };
  } catch {
    body = {};
  }
  return respond(request, body);
}

async function respond(request: Request, body?: { guia?: unknown }) {
  try {
    const result = await lookupPublicTracking(guiaFrom(request, body));
    if (!result) {
      return NextResponse.json(
        { error: { code: "TRACKING_NOT_FOUND", message: "No encontramos esa guía. Revisa el número e inténtalo de nuevo." } },
        { status: 404 },
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    const { status, body: payload } = errorToResponse(error);
    return NextResponse.json(payload, { status });
  }
}
