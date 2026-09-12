import { headers } from "next/headers";
import { hashApiKey, looksLikeApiKey } from "@/lib/api-keys";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export async function requireApiClient() {
  const headerStore = await headers();
  const authorization = headerStore.get("authorization") || headerStore.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new AppError("Falta el encabezado Authorization: Bearer <api_key>", 401, "API_KEY_REQUIRED");
  }
  const token = authorization.slice("Bearer ".length).trim();
  if (!looksLikeApiKey(token)) {
    throw new AppError("API key inválida", 401, "API_KEY_INVALID");
  }

  const key = await prisma.apiKey.findUnique({
    where: { hash: hashApiKey(token) },
    include: { client: true },
  });

  if (!key || key.revokedAt || !key.client.active) {
    throw new AppError("API key inválida o revocada", 401, "API_KEY_INVALID");
  }

  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });

  return key.client;
}
