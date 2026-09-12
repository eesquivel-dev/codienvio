import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ENVIA_MX_CARRIERS,
  EnviaProvider,
  buildEnviaLabelPayload,
  buildEnviaRatePayload,
  buildEnviaRatePayloads,
  mergeEnviaRateLists,
  parseEnviaLabel,
  parseEnviaRates,
} from "@/lib/providers/envia";
import type { ProviderRate, QuoteRatesInput } from "@/lib/providers/types";

const sample: QuoteRatesInput = {
  origin: {
    name: "Edgar",
    phone: "+52 5551234567",
    street: "Insurgentes",
    number: "1647",
    city: "Ciudad de México",
    state: "CX",
    postalCode: "03920",
    country: "MX",
  },
  destination: {
    name: "Ana",
    phone: "8181234567",
    street: "Constitución",
    city: "Monterrey",
    state: "NL",
    postalCode: "64060",
    country: "MX",
  },
  packages: [
    {
      type: "box",
      content: "Ropa",
      weightKg: 0.5,
      lengthCm: 30,
      widthCm: 20,
      heightCm: 10,
      declaredValueMxn: 450,
    },
  ],
};

function liveProvider() {
  return new EnviaProvider({
    token: "test-token",
    environment: "production",
    baseUrl: "https://api.envia.com",
    queriesUrl: "https://queries.envia.com",
    mock: false,
  });
}

describe("Envia payloads", () => {
  it("arma quote doméstico MX con carrier requerido", () => {
    const payload = buildEnviaRatePayload(sample, "estafeta");
    expect(payload.origin.country).toBe("MX");
    expect(payload.origin.phone).toBe("5551234567");
    expect(payload.shipment).toEqual({ type: 1, carrier: "estafeta" });
    expect(payload.settings.currency).toBe("MXN");
  });

  it("genera un payload por paquetería MX", () => {
    const payloads = buildEnviaRatePayloads(sample);
    expect(payloads.map((item) => item.shipment.carrier)).toEqual([...ENVIA_MX_CARRIERS]);
    expect(ENVIA_MX_CARRIERS).toEqual([
      "estafeta",
      "dhl",
      "fedex",
      "ups",
      "paquetexpress",
      "redpack",
    ]);
  });

  it("incluye carrier, service y formato de etiqueta", () => {
    const payload = buildEnviaLabelPayload({ ...sample, carrier: "estafeta", service: "ground" });
    expect(payload.shipment).toMatchObject({ carrier: "estafeta", service: "ground" });
    expect(payload.settings.printFormat).toBe("PDF");
  });
});

describe("mergeEnviaRateLists", () => {
  it("fusiona, deduplica por carrier+service y ordena por costo", () => {
    const merged = mergeEnviaRateLists([
      [
        {
          carrier: "dhl",
          service: "express",
          serviceName: "DHL",
          providerCost: 200,
          currency: "MXN",
        },
      ],
      [
        {
          carrier: "estafeta",
          service: "ground",
          serviceName: "Estafeta",
          providerCost: 100,
          currency: "MXN",
        },
        {
          carrier: "dhl",
          service: "express",
          serviceName: "DHL cheaper",
          providerCost: 180,
          currency: "MXN",
        },
      ],
    ]);
    expect(merged.map((rate) => `${rate.carrier}:${rate.providerCost}`)).toEqual([
      "estafeta:100",
      "dhl:180",
    ]);
  });
});

describe("Envia parsers", () => {
  it("mapea tarifas y usa totalPrice como provider cost", () => {
    const rates = parseEnviaRates({
      meta: "rate",
      data: [
        {
          carrier: "estafeta",
          service: "ground",
          serviceDescription: "Estafeta Terrestre",
          deliveryEstimate: "2-3 días",
          totalPrice: "125.50",
          currency: "MXN",
        },
      ],
    });
    expect(rates).toHaveLength(1);
    expect(rates[0]).toMatchObject({
      carrier: "estafeta",
      service: "ground",
      providerCost: 125.5,
    });
  });

  it("lanza si Envia responde error", () => {
    expect(() =>
      parseEnviaRates({
        meta: "error",
        error: { message: "Invalid zipcode" },
      }),
    ).toThrow(/Invalid zipcode/);
  });

  it("parsea guía con PDF y rastreo", () => {
    const label = parseEnviaLabel({
      meta: "generate",
      data: [
        {
          carrier: "estafeta",
          service: "ground",
          trackingNumber: "EST123",
          trackUrl: "https://tracking.envia.com/EST123",
          label: "https://files.envia.com/EST123.pdf",
          totalPrice: 125.5,
        },
      ],
    });
    expect(label.trackingNumber).toBe("EST123");
    expect(label.labelUrl).toContain(".pdf");
    expect(label.providerCost).toBe(125.5);
  });
});

describe("EnviaProvider.quoteRates", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("no llama a Envia en modo simulado", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const provider = new EnviaProvider({
      token: "unused",
      environment: "sandbox",
      baseUrl: "https://api-test.envia.com",
      queriesUrl: "https://queries.test.envia.com",
      mock: true,
    });
    const rates = await provider.quoteRates(sample);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(rates).toHaveLength(3);
    expect(rates.map((rate) => rate.carrier)).toEqual(["estafeta", "dhl", "fedex"]);
  });

  it("cotiza en paralelo por paquetería MX y fusiona tarifas", async () => {
    const carriers: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as { shipment: { carrier: string } };
        carriers.push(body.shipment.carrier);
        expect(body.shipment.carrier).toBeTruthy();
        return {
          status: 200,
          text: async () =>
            JSON.stringify({
              meta: "rate",
              data: [
                {
                  carrier: body.shipment.carrier,
                  service: "ground",
                  serviceDescription: `${body.shipment.carrier} terrestre`,
                  totalPrice: String(100 + carriers.length),
                  currency: "MXN",
                },
              ],
            }),
        };
      }),
    );

    const rates = await liveProvider().quoteRates(sample);
    expect(new Set(carriers)).toEqual(new Set(ENVIA_MX_CARRIERS));
    expect(rates).toHaveLength(ENVIA_MX_CARRIERS.length);
    expect(rates.every((rate) => rate.carrier && rate.service)).toBe(true);
  });

  it("omite paqueterías con error y conserva las demás", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as { shipment: { carrier: string } };
        if (body.shipment.carrier === "dhl") {
          return {
            status: 200,
            text: async () =>
              JSON.stringify({
                meta: "error",
                error: { message: "Required property missing: carrier" },
              }),
          };
        }
        return {
          status: 200,
          text: async () =>
            JSON.stringify({
              meta: "rate",
              data: [
                {
                  carrier: body.shipment.carrier,
                  service: "ground",
                  serviceDescription: body.shipment.carrier,
                  totalPrice: "90",
                  currency: "MXN",
                },
              ],
            }),
        };
      }),
    );

    const rates = await liveProvider().quoteRates(sample);
    expect(rates.some((rate) => rate.carrier === "dhl")).toBe(false);
    expect(rates).toHaveLength(ENVIA_MX_CARRIERS.length - 1);
  });

  it("falla si ninguna paquetería responde tarifas", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 200,
        text: async () => JSON.stringify({ meta: "error", error: { message: "No coverage" } }),
      })),
    );

    await expect(liveProvider().quoteRates(sample)).rejects.toThrow(/no devolvió tarifas/);
  });
});

describe("tipos de fusión", () => {
  it("acepta listas vacías", () => {
    const empty: ProviderRate[][] = [];
    expect(mergeEnviaRateLists(empty)).toEqual([]);
  });
});
