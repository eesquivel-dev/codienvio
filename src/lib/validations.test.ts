import { describe, expect, it } from "vitest";
import { adjustBalanceSchema, markBillingPeriodSchema, quoteRequestSchema, updateClientSchema } from "@/lib/validations";

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

describe("adjustBalanceSchema", () => {
  it("acepta carga y débito con motivo", () => {
    expect(
      adjustBalanceSchema.parse({
        clientId: "c1",
        amountMxn: "500.50",
        direction: "credit",
        note: "Transferencia SPEI",
      }),
    ).toMatchObject({ amountMxn: 500.5, direction: "credit" });
  });

  it("exige motivo y monto positivo", () => {
    expect(() =>
      adjustBalanceSchema.parse({
        clientId: "c1",
        amountMxn: 0,
        direction: "debit",
        note: "x",
      }),
    ).toThrow();
  });
});

describe("updateClientSchema", () => {
  it("acepta override de comisión o vacío (regla global)", () => {
    expect(
      updateClientSchema.parse({
        clientId: "c1",
        companyName: "Tienda Norte",
        feePercent: "18",
        feeFixedMxn: "0",
      }),
    ).toMatchObject({ companyName: "Tienda Norte", feePercent: 18, feeFixedMxn: 0 });
  });
});

describe("markBillingPeriodSchema", () => {
  it("acepta marcar un mes como facturado", () => {
    expect(
      markBillingPeriodSchema.parse({
        clientId: "c1",
        year: "2026",
        month: "9",
        status: "FACTURADO",
        note: "Factura interna septiembre",
      }),
    ).toMatchObject({ year: 2026, month: 9, status: "FACTURADO" });
  });
});
