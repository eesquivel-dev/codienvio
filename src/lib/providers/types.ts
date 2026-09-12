export type ProviderId = "envia" | "ivoy";

export type ProviderAddress = {
  name: string;
  company?: string;
  email?: string;
  phone: string;
  street: string;
  number?: string;
  district?: string;
  city: string;
  state: string;
  postalCode: string;
  country: "MX";
  reference?: string;
};

export type ProviderPackage = {
  type: "box" | "envelope" | "pallet";
  content: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  declaredValueMxn: number;
};

export type QuoteRatesInput = {
  origin: ProviderAddress;
  destination: ProviderAddress;
  packages: ProviderPackage[];
};

export type GenerateLabelInput = QuoteRatesInput & {
  carrier: string;
  service: string;
};

export type ProviderRate = {
  carrier: string;
  service: string;
  serviceName: string;
  deliveryEstimate?: string;
  providerCost: number;
  currency: "MXN";
  raw?: unknown;
};

export type ProviderLabel = {
  carrier: string;
  service: string;
  trackingNumber: string;
  trackingUrl?: string;
  labelUrl: string;
  providerCost: number;
  providerShipmentId?: string;
  currency: "MXN";
  raw?: unknown;
};

export type ProviderTracking = {
  trackingNumber: string;
  status: string;
  events: Array<{ description: string; date?: string }>;
};

export type ZipLookup = {
  postalCode: string;
  city: string;
  state: string;
  country: "MX";
  /** Colonias / suburbs returned by Envia geocodes. */
  suburbs: string[];
  /** Municipio or alcaldía (Envia `regions.region_2`). */
  municipality?: string;
};

/**
 * Carrier adapter. Envia is implemented; iVoy is a future hook.
 * Implementations must never return client-facing markup — only raw provider cost.
 */
export interface ShippingProvider {
  readonly id: ProviderId;
  readonly displayName: string;
  quoteRates(input: QuoteRatesInput): Promise<ProviderRate[]>;
  generateLabel(input: GenerateLabelInput): Promise<ProviderLabel>;
  track(trackingNumbers: string[]): Promise<ProviderTracking[]>;
  lookupZip?(postalCode: string): Promise<ZipLookup | null>;
  testConnection?(): Promise<{ ok: boolean; message: string }>;
}
