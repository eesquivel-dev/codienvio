import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const prismaMocks = vi.hoisted(() => {
  const client = {
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  const walletTransaction = {
    findUnique: vi.fn(),
    create: vi.fn(),
  };
  const walletTopUp = {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  };
  const prisma = {
    client,
    walletTransaction,
    walletTopUp,
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));
  return { prisma, client, walletTransaction, walletTopUp };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMocks.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { AppError } from "@/lib/errors";
import {
  applyMercadoPagoPayment,
  assertApprovedTopUpPayment,
  creditApprovedMercadoPagoTopUp,
  parseTopUpAmountMxn,
} from "@/lib/wallet-topup";

describe("parseTopUpAmountMxn", () => {
  it("normaliza a 2 decimales y valida rango", () => {
    expect(parseTopUpAmountMxn("200.005")).toBe(200.01);
    expect(parseTopUpAmountMxn(50)).toBe(50);
    expect(() => parseTopUpAmountMxn(10)).toThrow(/mínimo/i);
    expect(() => parseTopUpAmountMxn(80_000)).toThrow(/máximo/i);
  });
});

describe("assertApprovedTopUpPayment", () => {
  const payment = {
    id: "pay_1",
    status: "approved",
    transaction_amount: 500,
    currency_id: "MXN",
    external_reference: "top1",
    metadata: { client_id: "c1" },
  };

  it("acepta un pago aprobado en MXN del monto esperado", () => {
    expect(() =>
      assertApprovedTopUpPayment(payment, { clientId: "c1", amountMxn: 500 }),
    ).not.toThrow();
  });

  it("rechaza pendiente, otra moneda o monto distinto", () => {
    expect(() =>
      assertApprovedTopUpPayment({ ...payment, status: "pending" }, { clientId: "c1", amountMxn: 500 }),
    ).toThrow(AppError);
    expect(() =>
      assertApprovedTopUpPayment({ ...payment, currency_id: "USD" }, { clientId: "c1", amountMxn: 500 }),
    ).toThrow(/MXN/);
    expect(() =>
      assertApprovedTopUpPayment({ ...payment, transaction_amount: 100 }, { clientId: "c1", amountMxn: 500 }),
    ).toThrow(/no coincide/);
    expect(() =>
      assertApprovedTopUpPayment(payment, { clientId: "other", amountMxn: 500 }),
    ).toThrow(/cliente/);
  });
});

describe("creditApprovedMercadoPagoTopUp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prismaMocks.prisma) => Promise<unknown>) => fn(prismaMocks.prisma),
    );
  });

  it("incrementa saldo y guarda el payment id en el ledger", async () => {
    prismaMocks.walletTransaction.findUnique.mockResolvedValue(null);
    prismaMocks.walletTransaction.create.mockResolvedValue({ id: "txn1" });
    prismaMocks.client.update.mockResolvedValue({ balanceMxn: new Prisma.Decimal("700.00") });
    prismaMocks.walletTopUp.update.mockResolvedValue({});

    const result = await creditApprovedMercadoPagoTopUp({
      clientId: "c1",
      amountMxn: 500,
      paymentId: "mp_99",
      topUpId: "top1",
    });

    expect(result).toEqual({
      credited: true,
      alreadyCredited: false,
      balanceMxn: 700,
      amountMxn: 500,
      paymentId: "mp_99",
    });
    expect(prismaMocks.walletTransaction.create).toHaveBeenCalledWith({
      data: {
        clientId: "c1",
        amountMxn: 500,
        type: "TOP_UP",
        note: "Recarga con Mercado Pago",
        mercadopagoPaymentId: "mp_99",
      },
    });
    expect(prismaMocks.client.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { balanceMxn: { increment: 500 } },
      select: { balanceMxn: true },
    });
  });

  it("no vuelve a acreditar el mismo payment id", async () => {
    prismaMocks.walletTransaction.findUnique.mockResolvedValue({ id: "txn1", clientId: "c1" });
    prismaMocks.client.findUnique.mockResolvedValue({ balanceMxn: new Prisma.Decimal("700") });

    const first = await creditApprovedMercadoPagoTopUp({
      clientId: "c1",
      amountMxn: 500,
      paymentId: "mp_99",
      topUpId: "top1",
    });
    const second = await creditApprovedMercadoPagoTopUp({
      clientId: "c1",
      amountMxn: 500,
      paymentId: "mp_99",
      topUpId: "top1",
    });

    expect(first.alreadyCredited).toBe(true);
    expect(second.alreadyCredited).toBe(true);
    expect(prismaMocks.walletTransaction.create).not.toHaveBeenCalled();
    expect(prismaMocks.client.update).not.toHaveBeenCalled();
  });

  it("trata la violación de unique como ya acreditado", async () => {
    prismaMocks.walletTransaction.findUnique.mockResolvedValue(null);
    prismaMocks.walletTransaction.create.mockRejectedValue({ code: "P2002" });
    prismaMocks.client.findUnique.mockResolvedValue({ balanceMxn: new Prisma.Decimal("700") });

    const result = await creditApprovedMercadoPagoTopUp({
      clientId: "c1",
      amountMxn: 500,
      paymentId: "mp_99",
      topUpId: "top1",
    });

    expect(result.alreadyCredited).toBe(true);
    expect(result.credited).toBe(false);
    expect(prismaMocks.client.update).not.toHaveBeenCalled();
  });
});

describe("applyMercadoPagoPayment", () => {
  const previousToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-token";
    prismaMocks.prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof prismaMocks.prisma) => Promise<unknown>) => fn(prismaMocks.prisma),
    );
  });

  afterEach(() => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = previousToken;
  });

  function paymentResponse(overrides: Record<string, unknown> = {}) {
    return {
      ok: true,
      json: async () => ({
        id: 99,
        status: "approved",
        transaction_amount: 500,
        currency_id: "MXN",
        external_reference: "top1",
        metadata: { client_id: "c1" },
        ...overrides,
      }),
    };
  }

  it("consulta MP y acredita solo si el pago está approved", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(paymentResponse());
    prismaMocks.walletTopUp.findUnique.mockResolvedValue({
      id: "top1",
      clientId: "c1",
      amountMxn: new Prisma.Decimal("500"),
      status: "PENDING",
    });
    prismaMocks.walletTransaction.findUnique.mockResolvedValue(null);
    prismaMocks.walletTransaction.create.mockResolvedValue({ id: "txn1" });
    prismaMocks.client.update.mockResolvedValue({ balanceMxn: new Prisma.Decimal("500") });
    prismaMocks.walletTopUp.update.mockResolvedValue({});

    const result = await applyMercadoPagoPayment("99", fetchImpl as unknown as typeof fetch);
    expect(result.credited).toBe(true);
    expect(result.paymentStatus).toBe("approved");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.mercadopago.com/v1/payments/99",
      expect.objectContaining({
        headers: { Authorization: "Bearer TEST-token" },
      }),
    );
  });

  it("no acredita pagos pendientes", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(paymentResponse({ status: "pending" }));
    const result = await applyMercadoPagoPayment("99", fetchImpl as unknown as typeof fetch);
    expect(result.credited).toBe(false);
    expect(result.alreadyCredited).toBe(false);
    expect(result.paymentStatus).toBe("pending");
    expect(prismaMocks.walletTransaction.create).not.toHaveBeenCalled();
  });
});
