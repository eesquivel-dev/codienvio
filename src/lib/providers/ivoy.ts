import { AppError } from "@/lib/errors";
import type { ProviderLabel, ProviderRate, ProviderTracking, ShippingProvider } from "@/lib/providers/types";

function notImplemented(): never {
  throw new AppError(
    "iVoy aún no está habilitado. CodiEnvio solo opera con Envia.com en este MVP.",
    501,
    "PROVIDER_NOT_IMPLEMENTED",
  );
}

/** Stub for a future iVoy adapter. Do not call from production flows yet. */
export const ivoyProvider: ShippingProvider = {
  id: "ivoy",
  displayName: "iVoy",
  async quoteRates(): Promise<ProviderRate[]> {
    notImplemented();
  },
  async generateLabel(): Promise<ProviderLabel> {
    notImplemented();
  },
  async track(): Promise<ProviderTracking[]> {
    notImplemented();
  },
};
