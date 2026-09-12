import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { ProviderError } from "@/lib/errors";

const generateLabel = vi.hoisted(() => vi.fn());
const prismaMocks = vi.hoisted(() => {
  const client = {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  };
  const quote = {
    findFirst: vi.fn(),
    update: vi.fn(),
  };
  const shipment = { create: vi.fn() };
  const sale = { create: vi.fn() };
  const walletTransaction = { create: vi.fn() };
  const prisma = {
    client,
    quote,
    shipment,
    sale,
    walletTransaction,
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));
  return { prisma, client, quote, shipment, sale, walletTransaction };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMocks.prisma }));
vi.mock("@/lib/settings", () => ({
  getActiveProvider: vi.fn(async () => ({
    id: "envia",
    generateLabel,
  })),
  getDefaultFeeRule: vi.fn(async () => ({ percent: 15, fixedMxn: 10 })),
}));

import { purchaseFromQuote } from "@/lib/services/shipping";
import { insufficientBalanceMessage } from "@/lib/wallet-copy";

const request = {
  origin: { city: "CDMX" },
  destination: { city: "MTY" },
  packages: [],
};

const rate = {
  id: "r1",
  carrier: "estafeta",
  service: "ground",
  serviceName: "Terrestre",
  providerCost: new Prisma.Decimal("125.50"),
  feeAmount: new Prisma.Decimal("28.83"),
  clientPrice: new Prisma.Decimal("154.33"),
};

function clientRow(balance: string) {
  return {
    id: "c1",
    active: true,
    balanceMxn: new Prisma.Decimal(balance),
    feePercent: null,
    feeFixedMxn: null,
    user: { email: "cliente@demo.mx", name: "Cliente Demo" },
  };
}

function quoteRow() {
  return {
    id: "q1",
    clientId: "c1",
    status: "OPEN" as const,
    expiresAt: new Date(Date.now() + 60_000),
    shipment: null,
    request,
    rates: [rate],
  };
}

const purchasedShipment = {
  id: "s1",
  status: "PURCHASED",
  carrier: "estafeta",
  service: "ground",
  serviceName: "Terrestre",
  trackingNumber: "EST1",
  trackingUrl: "https://tracking.envia.com/EST1",
  labelUrl: "/demo-label.pdf",
  currency: "MXN",
  clientPrice: 154.33,
  origin: request.origin,
  destination: request.destination,
  packages: request.packages,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMocks.prisma.$transaction.mockImplementation(async (fn: (tx: typeof prismaMocks.prisma) => Promise<unknown>) =>
    fn(prismaMocks.prisma),
  );
});

describe("purchaseFromQuote wallet", () => {
  it("con saldo 0 no llama a Envía ni descuenta", async () => {
    prismaMocks.client.findUnique.mockResolvedValue(clientRow("0"));
    prismaMocks.quote.findFirst.mockResolvedValue(quoteRow());

    await expect(purchaseFromQuote("c1", "q1", "r1")).rejects.toMatchObject({
      code: "INSUFFICIENT_BALANCE",
      message: insufficientBalanceMessage(0, 154.33),
    });

    expect(generateLabel).not.toHaveBeenCalled();
    expect(prismaMocks.client.updateMany).not.toHaveBeenCalled();
    expect(prismaMocks.shipment.create).not.toHaveBeenCalled();
    expect(prismaMocks.sale.create).not.toHaveBeenCalled();
    expect(prismaMocks.walletTransaction.create).not.toHaveBeenCalled();
  });

  it("con saldo suficiente llama a Envía, descuenta clientPrice y registra ledger + venta", async () => {
    prismaMocks.client.findUnique.mockResolvedValue(clientRow("200"));
    prismaMocks.quote.findFirst.mockResolvedValue(quoteRow());
    prismaMocks.client.updateMany.mockResolvedValue({ count: 1 });
    generateLabel.mockResolvedValue({
      carrier: "estafeta",
      service: "ground",
      trackingNumber: "EST1",
      trackingUrl: "https://tracking.envia.com/EST1",
      labelUrl: "/demo-label.pdf",
      providerCost: 125.5,
      providerShipmentId: "p1",
    });
    prismaMocks.shipment.create.mockResolvedValue(purchasedShipment);
    prismaMocks.sale.create.mockResolvedValue({ id: "sale1" });
    prismaMocks.walletTransaction.create.mockResolvedValue({ id: "w1" });
    prismaMocks.quote.update.mockResolvedValue({ id: "q1" });

    const result = await purchaseFromQuote("c1", "q1", "r1");

    expect(generateLabel).toHaveBeenCalledOnce();
    expect(prismaMocks.client.updateMany).toHaveBeenCalledWith({
      where: { id: "c1", balanceMxn: { gte: 154.33 } },
      data: { balanceMxn: { decrement: 154.33 } },
    });
    expect(prismaMocks.sale.create).toHaveBeenCalled();
    expect(prismaMocks.walletTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: "c1",
        amountMxn: -154.33,
        type: "PURCHASE",
        shipmentId: "s1",
      }),
    });
    expect(prismaMocks.client.update).not.toHaveBeenCalled();
    expect(result.price).toBe(154.33);
    expect(result.trackingNumber).toBe("EST1");
  });

  it("si Envía falla no deja el cargo y no crea venta", async () => {
    prismaMocks.client.findUnique.mockResolvedValue(clientRow("200"));
    prismaMocks.quote.findFirst.mockResolvedValue(quoteRow());
    prismaMocks.client.updateMany.mockResolvedValue({ count: 1 });
    prismaMocks.client.update.mockResolvedValue({ id: "c1" });
    generateLabel.mockRejectedValue(
      new ProviderError("Saldo insuficiente en la cuenta de Envía. Recarga el monedero para comprar guías."),
    );
    prismaMocks.shipment.create.mockResolvedValue({ id: "failed1" });

    await expect(purchaseFromQuote("c1", "q1", "r1")).rejects.toThrow(/Envía|Envia|saldo insuficiente/i);

    expect(generateLabel).toHaveBeenCalledOnce();
    expect(prismaMocks.client.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { balanceMxn: { increment: 154.33 } },
    });
    expect(prismaMocks.sale.create).not.toHaveBeenCalled();
    expect(prismaMocks.walletTransaction.create).not.toHaveBeenCalled();
    expect(prismaMocks.shipment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "FAILED",
        clientPrice: rate.clientPrice,
      }),
    });
  });
});
