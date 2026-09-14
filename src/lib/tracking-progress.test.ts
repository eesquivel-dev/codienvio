import { describe, expect, it } from "vitest";
import { trackingProgressFrom } from "@/lib/tracking-progress";

describe("trackingProgressFrom", () => {
  it("arranca en Creada", () => {
    const view = trackingProgressFrom({ status: "Created" });
    expect(view.currentIndex).toBe(0);
    expect(view.completed).toBe(false);
    expect(view.exception).toBe(false);
    expect(view.steps.map((step) => step.label)).toEqual([
      "Creada",
      "En tránsito",
      "En ruta",
      "Entregada",
    ]);
  });

  it("avanza con el status de Envía", () => {
    expect(trackingProgressFrom({ status: "In Transit" }).currentIndex).toBe(1);
    expect(trackingProgressFrom({ status: "out_for_delivery" }).currentIndex).toBe(2);
    expect(trackingProgressFrom({ status: "Out for Delivery" }).currentIndex).toBe(2);
    expect(trackingProgressFrom({ status: "Delivered" }).completed).toBe(true);
  });

  it("usa el evento más avanzado si el status se queda atrás", () => {
    const view = trackingProgressFrom({
      status: "Created",
      events: [
        { description: "Guía creada" },
        { description: "En tránsito hacia el destino" },
        { description: "En ruta de entrega" },
      ],
    });
    expect(view.currentIndex).toBe(2);
  });

  it("marca incidencia sin perder el paso alcanzado", () => {
    const view = trackingProgressFrom({
      status: "Exception",
      events: [{ description: "En tránsito" }, { description: "Incidencia en aduana" }],
    });
    expect(view.currentIndex).toBe(1);
    expect(view.exception).toBe(true);
    expect(view.completed).toBe(false);
  });

  it("entregada limpia la incidencia", () => {
    const view = trackingProgressFrom({
      status: "Delivered",
      events: [{ description: "Incidencia resuelta" }, { description: "Entregada" }],
    });
    expect(view.completed).toBe(true);
    expect(view.exception).toBe(false);
  });
});
