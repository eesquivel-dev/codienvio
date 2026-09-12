import { describe, expect, it } from "vitest";
import {
  buildEnviaLabelPayload,
  buildEnviaRatePayload,
  parseEnviaLabel,
  parseEnviaRates,
} from "@/lib/providers/envia";

const sample = {
  origin: {
    name: "Edgar",
    phone: "+52 5551234567",
    street: "Insurgentes",
    number: "1647",
    city: "Ciudad de México",
    state: "CX",
    postalCode: "03920",
    country: "MX" as const,
  },
  destination: {
    name: "Ana",
    phone: "8181234567",
    street: "Constitución",
    city: "Monterrey",
    state: "NL",
    postalCode: "64060",
    country: "MX" as const,
  },
  packages: [
    {
      type: "box" as const,
      content: "Ropa",
      weightKg: 0.5,
      lengthCm: 30,
      widthCm: 20,
      heightCm: 10,
      declaredValueMxn: 450,
    },
  ],
};

describe("Envia payloads", () => {
  it("arma quote doméstico MX", () => {
    const payload = buildEnviaRatePayload(sample);
    expect(payload.origin.country).toBe("MX");
    expect(payload.origin.phone).toBe("5551234567");
    expect(payload.shipment.type).toBe(1);
    expect(payload.settings.currency).toBe("MXN");
  });

  it("incluye carrier, service y formato de etiqueta", () => {
    const payload = buildEnviaLabelPayload({ ...sample, carrier: "estafeta", service: "ground" });
    expect(payload.shipment).toMatchObject({ carrier: "estafeta", service: "ground" });
    expect(payload.settings.printFormat).toBe("PDF");
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
