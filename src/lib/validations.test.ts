import { describe, expect, it } from "vitest";
import {
  adjustBalanceSchema,
  markBillingPeriodSchema,
  quoteRequestSchema,
  savedAddressInputSchema,
  savedPackageInputSchema,
  updateClientSchema,
  walletTopUpSchema,
} from "@/lib/validations";

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

describe("walletTopUpSchema", () => {
  it("acepta montos dentro del rango", () => {
    expect(walletTopUpSchema.parse({ amountMxn: "200" })).toEqual({ amountMxn: 200 });
    expect(walletTopUpSchema.parse({ amountMxn: 50 })).toEqual({ amountMxn: 50 });
    expect(walletTopUpSchema.parse({ amountMxn: 50000 })).toEqual({ amountMxn: 50000 });
  });

  it("rechaza montos fuera de rango o inválidos", () => {
    expect(() => walletTopUpSchema.parse({ amountMxn: 49.99 })).toThrow(/mínimo/i);
    expect(() => walletTopUpSchema.parse({ amountMxn: 50000.01 })).toThrow(/máximo/i);
    expect(() => walletTopUpSchema.parse({ amountMxn: "abc" })).toThrow();
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

describe("savedAddressInputSchema", () => {
  it("pide alias y acepta tipo origen/destino/ambos", () => {
    const parsed = savedAddressInputSchema.parse({
      ...valid.origin,
      label: "Bodega CDMX",
      type: "ORIGIN",
    });
    expect(parsed).toMatchObject({ label: "Bodega CDMX", type: "ORIGIN", state: "CX" });
  });

  it("rechaza alias corto", () => {
    expect(() =>
      savedAddressInputSchema.parse({
        ...valid.origin,
        label: "A",
      }),
    ).toThrow(/alias/i);
  });
});

describe("savedPackageInputSchema", () => {
  it("acepta un preset de caja", () => {
    expect(
      savedPackageInputSchema.parse({
        nickname: "Caja ropa",
        ...valid.packages[0],
      }),
    ).toMatchObject({ nickname: "Caja ropa", type: "box", weightKg: 0.5 });
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
