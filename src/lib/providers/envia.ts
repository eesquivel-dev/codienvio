import { AppError, ProviderError } from "@/lib/errors";
import { asMoney } from "@/lib/money";
import { normalizeMxState } from "@/lib/mexico";
import type {
  GenerateLabelInput,
  ProviderAddress,
  ProviderLabel,
  ProviderPackage,
  ProviderRate,
  ProviderTracking,
  QuoteRatesInput,
  ShippingProvider,
  ZipLookup,
} from "@/lib/providers/types";

export type EnviaConfig = {
  token?: string;
  environment: "sandbox" | "production";
  baseUrl: string;
  queriesUrl: string;
  mock: boolean;
};

const GEOCODES_URL = "https://geocodes.envia.com";

function digits(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

function toEnviaAddress(address: ProviderAddress) {
  return {
    name: address.name,
    company: address.company || "",
    email: address.email || "",
    phone: digits(address.phone),
    street: address.street,
    number: address.number || "",
    district: address.district || "",
    city: address.city,
    state: address.state,
    country: "MX",
    postalCode: address.postalCode,
    phone_code: "MX",
    reference: address.reference || "",
  };
}

function toEnviaPackages(packages: ProviderPackage[]) {
  return packages.map((item) => ({
    type: item.type,
    content: item.content,
    amount: 1,
    declaredValue: item.declaredValueMxn,
    weight: item.weightKg,
    weightUnit: "KG",
    lengthUnit: "CM",
    dimensions: {
      length: item.lengthCm,
      width: item.widthCm,
      height: item.heightCm,
    },
  }));
}

export function buildEnviaRatePayload(input: QuoteRatesInput) {
  return {
    origin: toEnviaAddress(input.origin),
    destination: toEnviaAddress(input.destination),
    packages: toEnviaPackages(input.packages),
    shipment: { type: 1 },
    settings: { currency: "MXN" },
  };
}

export function buildEnviaLabelPayload(input: GenerateLabelInput) {
  return {
    ...buildEnviaRatePayload(input),
    shipment: {
      type: 1,
      carrier: input.carrier,
      service: input.service,
    },
    settings: {
      currency: "MXN",
      printFormat: "PDF",
      printSize: "STOCK_4X6",
    },
  };
}

function parseNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return asMoney(n);
}

export function parseEnviaRates(payload: unknown): ProviderRate[] {
  const body = payload as {
    meta?: string;
    data?: unknown;
    error?: { message?: string; description?: string; code?: string };
    message?: string;
  };

  if (body?.error || body?.meta === "error") {
    const message =
      body.error?.description ||
      body.error?.message ||
      body.message ||
      "Envia no pudo cotizar este envío";
    throw new ProviderError(message, body.error);
  }

  const rows = Array.isArray(body?.data) ? body.data : [];
  const rates: ProviderRate[] = [];

  for (const row of rows) {
    const item = row as Record<string, unknown>;
    const carrier = String(item.carrier ?? "");
    const service = String(item.service ?? "");
    if (!carrier || !service) continue;
    rates.push({
      carrier,
      service,
      serviceName: String(item.serviceDescription || item.serviceName || service),
      deliveryEstimate:
        typeof item.deliveryEstimate === "string" ? item.deliveryEstimate : undefined,
      providerCost: parseNumber(item.totalPrice),
      currency: "MXN",
      raw: {
        carrier: item.carrier,
        service: item.service,
        serviceDescription: item.serviceDescription,
        deliveryEstimate: item.deliveryEstimate,
        currency: item.currency,
      },
    });
  }

  return rates;
}

export function parseEnviaLabel(payload: unknown): ProviderLabel {
  const body = payload as {
    meta?: string;
    data?: unknown;
    error?: { message?: string; description?: string };
    message?: string;
  };

  if (body?.error || body?.meta === "error") {
    const message =
      body.error?.description ||
      body.error?.message ||
      body.message ||
      "Envia no pudo generar la guía";
    throw new ProviderError(message, body.error);
  }

  const first = Array.isArray(body?.data) ? body.data[0] : body?.data;
  if (!first || typeof first !== "object") {
    throw new ProviderError("Envia no devolvió una guía");
  }
  const item = first as Record<string, unknown>;
  const trackingNumber = String(item.trackingNumber ?? "");
  const labelUrl = String(item.label ?? item.labelUrl ?? "");
  if (!trackingNumber || !labelUrl) {
    throw new ProviderError("La respuesta de Envia no incluye guía o rastreo");
  }

  return {
    carrier: String(item.carrier ?? ""),
    service: String(item.service ?? ""),
    trackingNumber,
    trackingUrl: item.trackUrl ? String(item.trackUrl) : undefined,
    labelUrl,
    providerCost: parseNumber(item.totalPrice),
    providerShipmentId: item.shipmentId != null ? String(item.shipmentId) : undefined,
    currency: "MXN",
    raw: {
      carrier: item.carrier,
      service: item.service,
      trackingNumber,
      trackUrl: item.trackUrl,
    },
  };
}

function mockRates(): ProviderRate[] {
  return [
    {
      carrier: "estafeta",
      service: "ground",
      serviceName: "Estafeta Terrestre",
      deliveryEstimate: "2-3 días hábiles",
      providerCost: 125.5,
      currency: "MXN",
    },
    {
      carrier: "dhl",
      service: "express",
      serviceName: "DHL Express",
      deliveryEstimate: "1-2 días hábiles",
      providerCost: 248,
      currency: "MXN",
    },
    {
      carrier: "fedex",
      service: "ground",
      serviceName: "FedEx Economico",
      deliveryEstimate: "3-5 días hábiles",
      providerCost: 189.9,
      currency: "MXN",
    },
  ];
}

function mockLabel(input: GenerateLabelInput): ProviderLabel {
  const trackingNumber = `MOCK${Date.now().toString().slice(-10)}`;
  const selected = mockRates().find(
    (rate) => rate.carrier === input.carrier && rate.service === input.service,
  );
  return {
    carrier: input.carrier,
    service: input.service,
    trackingNumber,
    trackingUrl: `https://tracking.envia.com/${trackingNumber}`,
    labelUrl: "/demo-label.pdf",
    providerCost: selected?.providerCost ?? 125.5,
    providerShipmentId: `mock-${trackingNumber}`,
    currency: "MXN",
  };
}

export class EnviaProvider implements ShippingProvider {
  readonly id = "envia" as const;
  readonly displayName: string;

  constructor(private readonly config: EnviaConfig) {
    this.displayName = config.mock ? "Envia (simulado)" : "Envia.com";
  }

  private requireToken() {
    if (this.config.mock) return;
    if (!this.config.token) {
      throw new AppError(
        "Falta el token de Envia. Configúralo en Admin o en ENVIA_TOKEN.",
        503,
        "ENVIA_NOT_CONFIGURED",
      );
    }
  }

  private async request(path: string, body: unknown): Promise<unknown> {
    this.requireToken();
    const url = `${this.config.baseUrl.replace(/\/$/, "")}${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(35_000),
        cache: "no-store",
      });
    } catch (error) {
      throw new ProviderError("No se pudo conectar con Envia. Intenta de nuevo.", {
        cause: error instanceof Error ? error.message : String(error),
      });
    }

    const text = await response.text();
    if (response.status === 401) {
      throw new AppError(
        "Token de Envia inválido o de otro ambiente (sandbox vs producción).",
        401,
        "ENVIA_AUTH",
      );
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new ProviderError(`Respuesta inválida de Envia (HTTP ${response.status})`);
    }
  }

  async quoteRates(input: QuoteRatesInput): Promise<ProviderRate[]> {
    if (this.config.mock) return mockRates();
    const payload = await this.request("/ship/rate/", buildEnviaRatePayload(input));
    const rates = parseEnviaRates(payload);
    if (rates.length === 0) {
      throw new ProviderError(
        "Envia no devolvió tarifas para esta ruta. Revisa CP, ciudad y estado.",
      );
    }
    return rates;
  }

  async generateLabel(input: GenerateLabelInput): Promise<ProviderLabel> {
    if (this.config.mock) return mockLabel(input);
    const payload = await this.request("/ship/generate/", buildEnviaLabelPayload(input));
    return parseEnviaLabel(payload);
  }

  async track(trackingNumbers: string[]): Promise<ProviderTracking[]> {
    if (this.config.mock) {
      return trackingNumbers.map((trackingNumber) => ({
        trackingNumber,
        status: "Created",
        events: [{ description: "Guía creada (simulado)" }],
      }));
    }
    const payload = await this.request("/ship/generaltrack/", { trackingNumbers });
    const body = payload as { data?: unknown };
    const rows = Array.isArray(body.data) ? body.data : [];
    return rows.map((row) => {
      const item = row as Record<string, unknown>;
      return {
        trackingNumber: String(item.trackingNumber ?? item.tracking ?? ""),
        status: String(item.status ?? item.statusName ?? "Desconocido"),
        events: [],
      };
    });
  }

  async lookupZip(postalCode: string): Promise<ZipLookup | null> {
    if (!/^\d{5}$/.test(postalCode)) return null;
    if (this.config.mock) {
      const demo: Record<string, ZipLookup> = {
        "03920": { postalCode: "03920", city: "Ciudad de México", state: "CX", country: "MX" },
        "04530": { postalCode: "04530", city: "Ciudad de México", state: "CX", country: "MX" },
        "64060": { postalCode: "64060", city: "Monterrey", state: "NL", country: "MX" },
        "66220": { postalCode: "66220", city: "San Pedro Garza García", state: "NL", country: "MX" },
        "44100": { postalCode: "44100", city: "Guadalajara", state: "JA", country: "MX" },
      };
      return demo[postalCode] ?? {
        postalCode,
        city: "Ciudad de México",
        state: "CX",
        country: "MX",
      };
    }

    try {
      const response = await fetch(`${GEOCODES_URL}/zipcode/MX/${postalCode}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return null;
      const json = (await response.json()) as {
        success?: boolean;
        data?: { postalCode?: string; city?: string; state?: string };
      };
      const data = json.data;
      if (!data?.city || !data.state) return null;
      return {
        postalCode: data.postalCode || postalCode,
        city: data.city,
        state: normalizeMxState(data.state),
        country: "MX",
      };
    } catch {
      return null;
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (this.config.mock) {
      return { ok: true, message: "Modo simulado activo. No se llama a Envia." };
    }
    this.requireToken();
    try {
      const response = await fetch(
        `${this.config.queriesUrl.replace(/\/$/, "")}/carrier?country_code=MX`,
        {
          headers: { Authorization: `Bearer ${this.config.token}` },
          cache: "no-store",
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (response.status === 401) {
        return { ok: false, message: "Token rechazado. Usa un token sandbox en el ambiente de pruebas." };
      }
      if (!response.ok) {
        return { ok: false, message: `Envia respondió HTTP ${response.status}` };
      }
      return { ok: true, message: "Conexión con Envia sandbox/producción correcta." };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "No se pudo contactar Envia",
      };
    }
  }
}
