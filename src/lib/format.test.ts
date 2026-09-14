import { describe, expect, it } from "vitest";
import { carrierLabel, shipmentStatusLabel, trackingStatusLabel } from "@/lib/format";

describe("format", () => {
  it("nombra paqueterías conocidas", () => {
    expect(carrierLabel("estafeta")).toBe("Estafeta");
    expect(carrierLabel("DHL")).toBe("DHL");
    expect(carrierLabel("otra")).toBe("otra");
  });

  it("traduce estados de envío", () => {
    expect(shipmentStatusLabel("PURCHASED")).toBe("Comprada");
    expect(shipmentStatusLabel("FAILED")).toBe("Fallida");
  });

  it("traduce el ciclo de rastreo", () => {
    expect(trackingStatusLabel("Created")).toBe("Creada");
    expect(trackingStatusLabel("In Transit")).toBe("En tránsito");
    expect(trackingStatusLabel("Out for Delivery")).toBe("En ruta");
    expect(trackingStatusLabel("out_for_delivery")).toBe("En ruta");
    expect(trackingStatusLabel("Delivered")).toBe("Entregada");
  });
});
