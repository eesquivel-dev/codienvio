"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { generateApiKey } from "@/lib/api-keys";
import { AppError, errorToResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getActiveProvider, getSettingsRow, resolveEnviaToken, saveSettings } from "@/lib/settings";
import { getAdminDashboardStats } from "@/lib/services/shipping";
import { adjustClientWallet } from "@/lib/wallet";
import {
  adjustBalanceSchema,
  createClientSchema,
  markBillingPeriodSchema,
  settingsSchema,
  updateClientSchema,
} from "@/lib/validations";

function actionError(error: unknown) {
  const { body } = errorToResponse(error);
  return { ok: false as const, error: body.error.message };
}

export async function updateSettingsAction(formData: FormData) {
  try {
    await requireAdmin();
    const parsed = settingsSchema.parse({
      enviaToken: String(formData.get("enviaToken") ?? ""),
      enviaEnvironment: String(formData.get("enviaEnvironment") ?? "sandbox"),
      defaultFeePercent: formData.get("defaultFeePercent"),
      defaultFeeFixedMxn: formData.get("defaultFeeFixedMxn"),
      mockMode: formData.get("mockMode") === "on" || formData.get("mockMode") === "true",
    });
    await saveSettings(parsed);
    revalidatePath("/admin");
    return { ok: true as const };
  } catch (error) {
    return actionError(error);
  }
}

export async function testEnviaAction() {
  try {
    await requireAdmin();
    const provider = await getActiveProvider();
    if (!provider.testConnection) {
      throw new AppError("El proveedor no soporta prueba de conexión");
    }
    return { ok: true as const, result: await provider.testConnection() };
  } catch (error) {
    return actionError(error);
  }
}

export async function getAdminDashboardView() {
  await requireAdmin();
  return getAdminDashboardStats();
}

export async function getAdminSettingsView() {
  await requireAdmin();
  const settings = await getSettingsRow();
  const resolved = await resolveEnviaToken();
  return {
    enviaEnvironment: settings.enviaEnvironment,
    defaultFeePercent: Number(settings.defaultFeePercent),
    defaultFeeFixedMxn: Number(settings.defaultFeeFixedMxn),
    mockMode: settings.mockMode,
    hasStoredToken: resolved.hasStoredToken,
    hasEnvToken: Boolean(process.env.ENVIA_TOKEN),
    usingMock: resolved.mock,
  };
}

export async function createClientAction(formData: FormData) {
  try {
    await requireAdmin();
    const parsed = createClientSchema.parse({
      name: formData.get("name"),
      email: String(formData.get("email") ?? "").toLowerCase(),
      password: formData.get("password"),
      companyName: formData.get("companyName"),
      feePercent: formData.get("feePercent") === "" ? null : formData.get("feePercent"),
      feeFixedMxn: formData.get("feeFixedMxn") === "" ? null : formData.get("feeFixedMxn"),
    });

    const exists = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (exists) {
      throw new AppError("Ya existe un usuario con ese correo", 409, "EMAIL_TAKEN");
    }

    const user = await prisma.user.create({
      data: {
        email: parsed.email,
        name: parsed.name,
        passwordHash: await hash(parsed.password, 12),
        role: "CLIENT",
        client: {
          create: {
            companyName: parsed.companyName,
            feePercent: parsed.feePercent ?? null,
            feeFixedMxn: parsed.feeFixedMxn ?? null,
          },
        },
      },
      include: { client: true },
    });

    revalidatePath("/admin/clientes");
    revalidatePath("/admin/integraciones");
    revalidatePath("/admin/facturacion");
    return { ok: true as const, clientId: user.client?.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function createApiKeyAction(clientId: string, name: string) {
  try {
    await requireAdmin();
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new AppError("Cliente no encontrado", 404);
    const generated = generateApiKey();
    await prisma.apiKey.create({
      data: {
        clientId,
        name: name.trim() || "API key",
        prefix: generated.prefix,
        hash: generated.hash,
      },
    });
    revalidatePath("/admin/clientes");
    revalidatePath("/admin/integraciones");
    return { ok: true as const, apiKey: generated.plain, prefix: generated.prefix };
  } catch (error) {
    return actionError(error);
  }
}

export async function revokeApiKeyAction(keyId: string) {
  try {
    await requireAdmin();
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });
    revalidatePath("/admin/clientes");
    revalidatePath("/admin/integraciones");
    return { ok: true as const };
  } catch (error) {
    return actionError(error);
  }
}

export async function toggleClientAction(clientId: string, active: boolean) {
  try {
    await requireAdmin();
    await prisma.client.update({ where: { id: clientId }, data: { active } });
    revalidatePath("/admin/clientes");
    revalidatePath("/admin/integraciones");
    revalidatePath("/admin/facturacion");
    return { ok: true as const };
  } catch (error) {
    return actionError(error);
  }
}

export async function adjustClientBalanceAction(formData: FormData) {
  try {
    const session = await requireAdmin();
    const parsed = adjustBalanceSchema.parse({
      clientId: formData.get("clientId"),
      amountMxn: formData.get("amountMxn"),
      direction: formData.get("direction"),
      note: formData.get("note"),
    });
    const client = await prisma.client.findUnique({ where: { id: parsed.clientId } });
    if (!client) throw new AppError("Cliente no encontrado", 404);

    const result = await adjustClientWallet({
      clientId: parsed.clientId,
      amountMxn: parsed.amountMxn,
      direction: parsed.direction,
      note: parsed.note,
      createdByUserId: session.user.id,
    });

    revalidatePath("/admin/clientes");
    revalidatePath("/admin/facturacion");
    revalidatePath("/portal");
    return { ok: true as const, balanceMxn: result.balanceMxn };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateClientAction(formData: FormData) {
  try {
    await requireAdmin();
    const parsed = updateClientSchema.parse({
      clientId: formData.get("clientId"),
      companyName: formData.get("companyName"),
      feePercent: formData.get("feePercent") === "" ? null : formData.get("feePercent"),
      feeFixedMxn: formData.get("feeFixedMxn") === "" ? null : formData.get("feeFixedMxn"),
    });
    const client = await prisma.client.findUnique({ where: { id: parsed.clientId } });
    if (!client) throw new AppError("Cliente no encontrado", 404);

    await prisma.client.update({
      where: { id: parsed.clientId },
      data: {
        companyName: parsed.companyName,
        feePercent: parsed.feePercent ?? null,
        feeFixedMxn: parsed.feeFixedMxn ?? null,
      },
    });
    revalidatePath("/admin/clientes");
    revalidatePath("/admin/integraciones");
    revalidatePath("/admin/facturacion");
    return { ok: true as const };
  } catch (error) {
    return actionError(error);
  }
}

export async function markBillingPeriodAction(formData: FormData) {
  try {
    const session = await requireAdmin();
    const parsed = markBillingPeriodSchema.parse({
      clientId: formData.get("clientId"),
      year: formData.get("year"),
      month: formData.get("month"),
      status: formData.get("status"),
      note: formData.get("note") ?? "",
    });
    const client = await prisma.client.findUnique({ where: { id: parsed.clientId } });
    if (!client) throw new AppError("Cliente no encontrado", 404);

    const marked = parsed.status === "FACTURADO";
    await prisma.billingPeriod.upsert({
      where: {
        clientId_year_month: {
          clientId: parsed.clientId,
          year: parsed.year,
          month: parsed.month,
        },
      },
      create: {
        clientId: parsed.clientId,
        year: parsed.year,
        month: parsed.month,
        status: parsed.status,
        note: parsed.note || null,
        markedAt: marked ? new Date() : null,
        markedById: marked ? session.user.id : null,
      },
      update: {
        status: parsed.status,
        note: parsed.note || null,
        markedAt: marked ? new Date() : null,
        markedById: marked ? session.user.id : null,
      },
    });

    revalidatePath("/admin/facturacion");
    return { ok: true as const };
  } catch (error) {
    return actionError(error);
  }
}
