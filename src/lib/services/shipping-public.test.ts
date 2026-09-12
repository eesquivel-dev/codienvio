import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { toPublicQuote, toPublicShipment } from "@/lib/services/shipping";

describe("public mappers", () => {
  it("oculta margen en cotización", () => {
    const quote = toPublicQuote({
      id: "q1",
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
      rates: [
        {
          id: "r1",
          carrier: "estafeta",
          service: "ground",
          serviceName: "Terrestre",
          deliveryEstimate: "2 días",
          currency: "MXN",
          clientPrice: new Prisma.Decimal("154.33"),
        },
      ],
    });
    expect(quote.rates[0].price).toBe(154.33);
    expect(JSON.stringify(quote)).not.toContain("provider");
    expect(JSON.stringify(quote)).not.toContain("fee");
  });

  it("oculta margen en envío", () => {
    const shipment = toPublicShipment({
      id: "s1",
      status: "PURCHASED",
      carrier: "estafeta",
      service: "ground",
      serviceName: "Terrestre",
      trackingNumber: "EST1",
      trackingUrl: null,
      labelUrl: "/demo-label.pdf",
      currency: "MXN",
      clientPrice: 154.33,
      origin: {},
      destination: {},
      packages: [],
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(shipment.price).toBe(154.33);
    expect(shipment).not.toHaveProperty("providerCost");
    expect(shipment).not.toHaveProperty("feeAmount");
  });
});
