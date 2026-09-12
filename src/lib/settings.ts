import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { asMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { createEnviaProvider, enviaUrls } from "@/lib/providers";
import type { FeeRule } from "@/lib/fees";
import type { ShippingProvider } from "@/lib/providers/types";

export async function getSettingsRow() {
  return prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      enviaEnvironment: process.env.ENVIA_ENVIRONMENT === "production" ? "production" : "sandbox",
      mockMode: process.env.ENVIA_MOCK === "true",
    },
  });
}

export async function getDefaultFeeRule(): Promise<FeeRule> {
  const settings = await getSettingsRow();
  return {
    percent: asMoney(settings.defaultFeePercent),
    fixedMxn: asMoney(settings.defaultFeeFixedMxn),
  };
}

export async function resolveEnviaToken(): Promise<{
  token?: string;
  environment: "sandbox" | "production";
  mock: boolean;
  hasStoredToken: boolean;
}> {
  const settings = await getSettingsRow();
  let token: string | undefined;
  if (settings.enviaTokenEnc) {
    try {
      token = decryptSecret(settings.enviaTokenEnc);
    } catch {
      token = undefined;
    }
  }
  if (!token) {
    token = process.env.ENVIA_TOKEN || undefined;
  }
  const environment =
    settings.enviaEnvironment === "production" ? "production" : "sandbox";
  const mock = settings.mockMode || process.env.ENVIA_MOCK === "true";
  return {
    token,
    environment,
    mock,
    hasStoredToken: Boolean(settings.enviaTokenEnc),
  };
}

export async function getActiveProvider(): Promise<ShippingProvider> {
  const resolved = await resolveEnviaToken();
  const urls = enviaUrls(resolved.environment);
  return createEnviaProvider({
    token: resolved.token,
    environment: resolved.environment,
    baseUrl: urls.baseUrl,
    queriesUrl: urls.queriesUrl,
    mock: resolved.mock,
  });
}

export async function saveSettings(input: {
  enviaToken?: string;
  enviaEnvironment: "sandbox" | "production";
  defaultFeePercent: number;
  defaultFeeFixedMxn: number;
  mockMode: boolean;
}) {
  const current = await getSettingsRow();
  let enviaTokenEnc = current.enviaTokenEnc;
  if (input.enviaToken && input.enviaToken.trim()) {
    enviaTokenEnc = encryptSecret(input.enviaToken.trim());
  }
  return prisma.settings.update({
    where: { id: "default" },
    data: {
      enviaTokenEnc,
      enviaEnvironment: input.enviaEnvironment,
      defaultFeePercent: input.defaultFeePercent,
      defaultFeeFixedMxn: input.defaultFeeFixedMxn,
      mockMode: input.mockMode,
    },
  });
}
