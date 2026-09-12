import { describe, expect, it } from "vitest";
import { carrierLabel, shipmentStatusLabel } from "@/lib/format";

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
});
