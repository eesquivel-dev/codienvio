import { readFile } from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";
import { resolveBaseUrl } from "@/lib/base-url";

export const dynamic = "force-dynamic";

export async function GET() {
  const template = await readFile(path.join(process.cwd(), "src/openapi/openapi.yaml"), "utf8");
  const baseUrl = resolveBaseUrl(await headers());
  return new Response(template.replaceAll("__BASE_URL__", baseUrl), {
    headers: { "content-type": "application/yaml; charset=utf-8", "cache-control": "no-store" },
  });
}
