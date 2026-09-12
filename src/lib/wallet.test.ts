import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import { formatMxn } from "@/lib/money";
import {
  assertSufficientBalance,
  canAfford,
  insufficientBalanceError,
  insufficientBalanceMessage,
  reserveClientFunds,
  walletTxnTypeLabel,
} from "@/lib/wallet";

describe("wallet copy", () => {
  it("exige saldo ≥ precio de venta", () => {
    expect(canAfford(0, 154.33)).toBe(false);
    expect(canAfford(154.32, 154.33)).toBe(false);
    expect(canAfford(154.33, 154.33)).toBe(true);
    expect(canAfford(200, 154.33)).toBe(true);
  });

  it("arma el mensaje de saldo insuficiente en español", () => {
    const message = insufficientBalanceMessage(0, 154.33);
    expect(message).toBe(`Saldo insuficiente. Tu saldo es ${formatMxn(0)}; esta guía cuesta ${formatMxn(154.33)}.`);
    const error = insufficientBalanceError(10, 25);
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(402);
    expect(error.code).toBe("INSUFFICIENT_BALANCE");
    expect(() => assertSufficientBalance(0, 100)).toThrow(/Saldo insuficiente/);
  });

  it("etiqueta movimientos del ledger", () => {
    expect(walletTxnTypeLabel("TOP_UP")).toBe("Carga");
    expect(walletTxnTypeLabel("PURCHASE")).toBe("Compra de guía");
    expect(walletTxnTypeLabel("ADJUSTMENT")).toBe("Ajuste");
  });
});

describe("reserveClientFunds", () => {
  it("descuenta solo si el UPDATE atómico afecta 1 fila", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findUnique = vi.fn().mockResolvedValue({ balanceMxn: 200 });
    const db = {
      client: { findUnique, updateMany },
    };

    const result = await reserveClientFunds(db as never, "c1", 154.33);
    expect(result).toEqual({ previousMxn: 200, nextMxn: 45.67 });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "c1", balanceMxn: { gte: 154.33 } },
      data: { balanceMxn: { decrement: 154.33 } },
    });
  });

  it("falla sin descontar si otra compra concurrente ya gastó el saldo", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const findUnique = vi.fn().mockResolvedValue({ balanceMxn: 50 });
    const db = {
      client: { findUnique, updateMany },
    };

    await expect(reserveClientFunds(db as never, "c1", 154.33)).rejects.toMatchObject({
      code: "INSUFFICIENT_BALANCE",
      status: 402,
    });
    expect(updateMany).toHaveBeenCalled();
  });
});
