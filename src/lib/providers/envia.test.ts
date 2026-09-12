import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ENVIA_MOCK_ZIPS,
  ENVIA_MX_CARRIERS,
  EnviaProvider,
  buildEnviaLabelPayload,
  buildEnviaRatePayload,
  buildEnviaRatePayloads,
  mergeEnviaRateLists,
  parseEnviaGeocode,
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

const enviaGeocode03920 = [
  {
    zip_code: "03920",
    country: { name: "México", code: "MX" },
    state: {
      name: "Ciudad de Mexico",
      iso_code: "MX-CMX",
      code: { "1digit": null, "2digit": "CX", "3digit": "CMX" },
    },
    locality: "Ciudad de México",
    suburbs: ["Insurgentes Mixcoac"],
    coordinates: { latitude: "19.372097", longitude: "-99.183392" },
    regions: { region_1: "Ciudad de Mexico", region_2: "Benito Juárez", region_3: "", region_4: "" },
  },
];

describe("parseEnviaGeocode", () => {
  it("lee el arreglo real de geocodes (no {success,data})", () => {
    const lookup = parseEnviaGeocode(enviaGeocode03920, "03920");
    expect(lookup).toEqual({
      postalCode: "03920",
      city: "Ciudad de México",
      state: "CX",
      country: "MX",
      suburbs: ["Insurgentes Mixcoac"],
      municipality: "Benito Juárez",
    });
  });

  it("fusiona colonias de varias filas y usa el código de 2 letras", () => {
    const lookup = parseEnviaGeocode(
      [
        {
          zip_code: "64060",
          locality: "Monterrey",
          state: { code: { "2digit": "NL", "3digit": "NLE" }, iso_code: "MX-NLE" },
          suburbs: ["Centro", "Obispado"],
          regions: { region_2: "Monterrey" },
        },
        {
          zip_code: "64060",
          locality: "Monterrey",
          state: { code: { "2digit": "NL" } },
          suburbs: ["Obispado", "Vista Hermosa"],
        },
      ],
      "64060",
    );
    expect(lookup?.state).toBe("NL");
    expect(lookup?.suburbs).toEqual(["Centro", "Obispado", "Vista Hermosa"]);
  });

  it("acepta el shape legado {data:{city,state}} sin colonias", () => {
    expect(
      parseEnviaGeocode({ data: { city: "Guadalajara", state: "JA", postalCode: "44100" } }, "44100"),
    ).toMatchObject({
      city: "Guadalajara",
      state: "JA",
      suburbs: [],
    });
  });

  it("normaliza iso MX-CMX si falta el código de 2 dígitos", () => {
    expect(
      parseEnviaGeocode(
        [{ locality: "Ciudad de México", state: { iso_code: "MX-CMX" }, suburbs: ["Roma Norte"] }],
        "06700",
      )?.state,
    ).toBe("CX");
  });

  it("devuelve null si Envia responde [] o sin ciudad", () => {
    expect(parseEnviaGeocode([], "00000")).toBeNull();
    expect(parseEnviaGeocode({ success: true, data: { state: "CX" } }, "03920")).toBeNull();
  });
});

describe("EnviaProvider.lookupZip", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("en modo simulado incluye colonias de los CP demo y no inventa el resto", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const provider = new EnviaProvider({
      token: "unused",
      environment: "sandbox",
      baseUrl: "https://api-test.envia.com",
      queriesUrl: "https://queries.test.envia.com",
      mock: true,
    });
    expect(ENVIA_MOCK_ZIPS["03920"]?.suburbs).toEqual(["Insurgentes Mixcoac"]);
    expect(await provider.lookupZip("03920")).toEqual(ENVIA_MOCK_ZIPS["03920"]);
    const monterrey = await provider.lookupZip("64060");
    expect(monterrey).toMatchObject({
      city: "Monterrey",
      state: "NL",
      suburbs: expect.arrayContaining(["Centro", "Obispado"]),
    });
    expect(await provider.lookupZip("00000")).toBeNull();
    expect(await provider.lookupZip("0392")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("parsea la respuesta en arreglo de geocodes.envia.com", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        expect(url).toBe("https://geocodes.envia.com/zipcode/MX/03920");
        return { ok: true, json: async () => enviaGeocode03920 };
      }),
    );
    expect(await liveProvider().lookupZip("03920")).toMatchObject({
      city: "Ciudad de México",
      state: "CX",
      suburbs: ["Insurgentes Mixcoac"],
    });
  });

  it("devuelve null si el shape antiguo {data.city} no viene y el arreglo está vacío", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ success: true, data: { postalCode: "03920" } }),
      })),
    );
    expect(await liveProvider().lookupZip("03920")).toBeNull();
  });
});
