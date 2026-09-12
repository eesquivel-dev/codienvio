import { describe, expect, it } from "vitest";
import { applyFee, resolveFeeRule, stripProviderCost } from "@/lib/fees";

describe("applyFee", () => {
  it("aplica porcentaje y cargo fijo en centavos", () => {
    expect(applyFee(125.5, { percent: 15, fixedMxn: 10 })).toEqual({
      providerCost: 125.5,
      feeAmount: 28.83,
      clientPrice: 154.33,
    });
  });

  it("marca 20% sobre el costo Envia sin cargo fijo", () => {
    expect(applyFee(100, { percent: 20, fixedMxn: 0 })).toEqual({
      providerCost: 100,
      feeAmount: 20,
      clientPrice: 120,
    });
  });

  it("permite solo porcentaje o solo fijo", () => {
    expect(applyFee(100, { percent: 10, fixedMxn: 0 })).toEqual({
      providerCost: 100,
      feeAmount: 10,
      clientPrice: 110,
    });
    expect(applyFee(100, { percent: 0, fixedMxn: 25 })).toEqual({
      providerCost: 100,
      feeAmount: 25,
      clientPrice: 125,
    });
  });

  it("rechaza reglas inválidas", () => {
    expect(() => applyFee(10, { percent: -1, fixedMxn: 0 })).toThrow();
    expect(() => applyFee(10, { percent: 101, fixedMxn: 0 })).toThrow();
  });
});

describe("resolveFeeRule", () => {
  it("usa override de cliente cuando existe", () => {
    expect(
      resolveFeeRule({ percent: 15, fixedMxn: 10 }, { percent: 8, fixedMxn: null }),
    ).toEqual({ percent: 8, fixedMxn: 10 });
  });
});

describe("stripProviderCost", () => {
  it("nunca deja providerCost ni feeAmount", () => {
    const publicRate = stripProviderCost({
      id: "r1",
      providerCost: 100,
      feeAmount: 25,
      clientPrice: 125,
    });
    expect(publicRate).toEqual({ id: "r1", clientPrice: 125 });
    expect(publicRate).not.toHaveProperty("providerCost");
    expect(publicRate).not.toHaveProperty("feeAmount");
  });
});
