"use server";

import { revalidatePath } from "next/cache";
import { generateApiKey } from "@/lib/api-keys";
import { requireClient } from "@/lib/auth";
import { errorToResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

/** Revokes the signed-in client's active keys and issues a new one (shown once). */
export async function regenerateOwnApiKeyAction() {
  try {
    const session = await requireClient();
    const clientId = session.user.clientId!;
    const generated = generateApiKey();
    await prisma.$transaction([
      prisma.apiKey.updateMany({ where: { clientId, revokedAt: null }, data: { revokedAt: new Date() } }),
      prisma.apiKey.create({
        data: { clientId, name: "Portal del cliente", prefix: generated.prefix, hash: generated.hash },
      }),
    ]);
    revalidatePath("/portal/api");
    return { ok: true as const, apiKey: generated.plain, prefix: generated.prefix };
  } catch (error) {
    const { body } = errorToResponse(error);
    return { ok: false as const, error: body.error.message };
  }
}
