import { describe, expect, it } from "vitest";
import {
  isValidTrackingNumber,
  mockPublicTracking,
  normalizeTrackingNumber,
  PUBLIC_TRACKING_FORBIDDEN_KEYS,
  toPublicTracking,
} from "@/lib/tracking";

describe("normalizeTrackingNumber", () => {
  it("recorta, mayúsculas y quita espacios", () => {
    expect(normalizeTrackingNumber("  ce-demo-001 ")).toBe("CE-DEMO-001");
    expect(isValidTrackingNumber("CE-DEMO-001")).toBe(true);
    expect(isValidTrackingNumber("abc")).toBe(false);
    expect(isValidTrackingNumber("guia con espacios!!")).toBe(false);
  });
});

describe("toPublicTracking", () => {
  it("solo expone estado público, sin precios ni cliente", () => {
    const view = toPublicTracking({
      trackingNumber: "ce-demo-001",
      status: "In Transit",
      carrier: "dhl",
      serviceName: "Express",
      events: [{ description: "En tránsito" }],
      trackingUrl: "https://example.com/track/CE-DEMO-001",
    });
    expect(view.trackingNumber).toBe("CE-DEMO-001");
    expect(view.statusLabel).toBe("En tránsito");
    expect(view.carrierLabel).toBe("DHL");
    for (const key of PUBLIC_TRACKING_FORBIDDEN_KEYS) {
      expect(view).not.toHaveProperty(key);
    }
  });
});

describe("mockPublicTracking", () => {
  const now = new Date("2026-09-14T18:00:00.000Z");

  it("marca fallos como incidencia", () => {
    const view = mockPublicTracking({
      trackingNumber: "CE-DEMO-FAIL",
      createdAt: "2026-09-11T18:00:00.000Z",
      shipmentStatus: "FAILED",
      carrier: "redpack",
      now,
    });
    expect(view.status).toBe("Exception");
    expect(view.statusLabel).toBe("Incidencia");
    expect(view.events[0]?.description).toMatch(/no se pudo/i);
  });

  it("avanza Created → tránsito → entregada según la antigüedad", () => {
    expect(
      mockPublicTracking({
        trackingNumber: "CE1",
        createdAt: "2026-09-14T12:00:00.000Z",
        shipmentStatus: "PURCHASED",
        now,
      }).status,
    ).toBe("Created");
    expect(
      mockPublicTracking({
        trackingNumber: "CE2",
        createdAt: "2026-09-12T12:00:00.000Z",
        shipmentStatus: "PURCHASED",
        now,
      }).status,
    ).toBe("In Transit");
    expect(
      mockPublicTracking({
        trackingNumber: "CE3",
        createdAt: "2026-09-10T12:00:00.000Z",
        shipmentStatus: "PURCHASED",
        now,
      }).status,
    ).toBe("Delivered");
  });
});
