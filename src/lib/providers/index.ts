import { AppError } from "@/lib/errors";
import { EnviaProvider, type EnviaConfig } from "@/lib/providers/envia";
import { ivoyProvider } from "@/lib/providers/ivoy";
import type { ProviderId, ShippingProvider } from "@/lib/providers/types";

export type { ShippingProvider, ProviderId } from "@/lib/providers/types";
export { ivoyProvider } from "@/lib/providers/ivoy";
export { EnviaProvider } from "@/lib/providers/envia";

export function enviaUrls(environment: "sandbox" | "production"): {
  baseUrl: string;
  queriesUrl: string;
} {
  if (environment === "production") {
    return {
      baseUrl: process.env.ENVIA_BASE_URL || "https://api.envia.com",
      queriesUrl: process.env.ENVIA_QUERIES_URL || "https://queries.envia.com",
    };
  }
  return {
    baseUrl: process.env.ENVIA_BASE_URL || "https://api-test.envia.com",
    queriesUrl: process.env.ENVIA_QUERIES_URL || "https://queries.test.envia.com",
  };
}

export function createEnviaProvider(config: EnviaConfig): ShippingProvider {
  return new EnviaProvider(config);
}

export function getProvider(id: ProviderId, envia: ShippingProvider): ShippingProvider {
  if (id === "envia") return envia;
  if (id === "ivoy") return ivoyProvider;
  throw new AppError(`Proveedor desconocido: ${id}`, 400, "UNKNOWN_PROVIDER");
}
