import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("guía consultation layout", () => {
  it("pone el stepper de rastreo encima del resumen en el detalle del portal", () => {
    const source = readFileSync("src/app/portal/envios/[id]/page.tsx", "utf8");
    const stepper = source.indexOf("<TrackingStepper");
    const resumen = source.indexOf("Resumen");
    expect(stepper).toBeGreaterThan(-1);
    expect(resumen).toBeGreaterThan(stepper);
  });

  it("pone el stepper arriba de paquetería y eventos en el resultado de consulta", () => {
    const source = readFileSync("src/components/tracking-bar.tsx", "utf8");
    const stepper = source.indexOf("<TrackingStepper");
    const events = source.lastIndexOf("result.events.map");
    expect(stepper).toBeGreaterThan(-1);
    expect(events).toBeGreaterThan(stepper);
  });
});
