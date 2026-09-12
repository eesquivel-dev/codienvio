import { describe, expect, it } from "vitest";
import { quoteRequestSchema } from "@/lib/validations";

const valid = {
  origin: {
    name: "Edgar",
    phone: "5551234567",
    street: "Insurgentes",
    city: "Ciudad de México",
    state: "cx",
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
      content: "Ropa",
      weightKg: 0.5,
      lengthCm: 30,
      widthCm: 20,
      heightCm: 10,
      declaredValueMxn: 450,
    },
  ],
};

describe("quoteRequestSchema", () => {
  it("normaliza estado CDMX y acepta envío MX", () => {
    const parsed = quoteRequestSchema.parse(valid);
    expect(parsed.origin.state).toBe("CX");
  });

  it("rechaza CP inválido", () => {
    expect(() =>
      quoteRequestSchema.parse({
        ...valid,
        destination: { ...valid.destination, postalCode: "6406" },
      }),
    ).toThrow();
  });
});
