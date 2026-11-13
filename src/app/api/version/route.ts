import { NextResponse } from "next/server";
import { readRelease, toVersionPayload } from "@/lib/release";

export function GET() {
  return NextResponse.json(toVersionPayload(readRelease()), {
    headers: { "Cache-Control": "no-store" },
  });
}
