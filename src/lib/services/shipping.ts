import { Prisma } from "@prisma/client";
import { applyFee, resolveFeeRule, type FeeRule } from "@/lib/fees";
import { AppError } from "@/lib/errors";
import { asMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getActiveProvider, getDefaultFeeRule } from "@/lib/settings";
import type { AddressInput, QuoteRequestInput } from "@/lib/validations";
import { quoteRequestSchema } from "@/lib/validations";
import {
  assertSufficientBalance,
  recordPurchaseCharge,
  releaseClientFunds,
  reserveClientFunds,
} from "@/lib/wallet";

const QUOTE_TTL_MS = 30 * 60 * 1000;

function feeForClient(
  defaults: FeeRule,
  client: { feePercent: Prisma.Decimal | null; feeFixedMxn: Prisma.Decimal | null },
): FeeRule {
  return resolveFeeRule(defaults, {
    percent: client.feePercent === null ? null : asMoney(client.feePercent),
    fixedMxn: client.feeFixedMxn === null ? null : asMoney(client.feeFixedMxn),
  });
}

async function loadActiveClient(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { user: true },
  });
  if (!client || !client.active) {
    throw new AppError("Cliente inactivo o inexistente", 403, "CLIENT_INACTIVE");
  }
  return client;
}

async function enrichAddress(address: AddressInput) {
  const provider = await getActiveProvider();
  if (!provider.lookupZip) return address;
  const geo = await provider.lookupZip(address.postalCode);
  if (!geo) return address;
  return {
    ...address,
    city: address.city || geo.city,
    state: address.state || geo.state,
    district:
      address.district ||
      (geo.suburbs.length === 1 ? geo.suburbs[0] : address.district),
  };
}

export function toPublicRate(rate: {
  id: string;
  carrier: string;
  service: string;
  serviceName: string;
  deliveryEstimate: string | null;
  currency: string;
  clientPrice: Prisma.Decimal | number;
}) {
  return {
    id: rate.id,
    carrier: rate.carrier,
    service: rate.service,
    serviceName: rate.serviceName,
    deliveryEstimate: rate.deliveryEstimate,
    currency: rate.currency,
    price: asMoney(rate.clientPrice),
  };
}

export function toPublicQuote(quote: {
  id: string;
  expiresAt: Date;
  rates: Array<{
    id: string;
    carrier: string;
    service: string;
    serviceName: string;
    deliveryEstimate: string | null;
    currency: string;
    clientPrice: Prisma.Decimal | number;
  }>;
}) {
  return {
    quoteId: quote.id,
    expiresAt: quote.expiresAt.toISOString(),
    currency: "MXN" as const,
    rates: quote.rates
      .map(toPublicRate)
      .sort((a, b) => a.price - b.price),
  };
}

export function toPublicShipment(shipment: {
  id: string;
  status: string;
  carrier: string;
  service: string;
  serviceName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
  currency: string;
  clientPrice: Prisma.Decimal | number;
  origin: unknown;
  destination: unknown;
  packages: unknown;
  createdAt: Date;
  errorMessage?: string | null;
}) {
  return {
    id: shipment.id,
    status: shipment.status,
    carrier: shipment.carrier,
    service: shipment.service,
    serviceName: shipment.serviceName,
    trackingNumber: shipment.trackingNumber,
    trackingUrl: shipment.trackingUrl,
    labelUrl: shipment.labelUrl,
    currency: shipment.currency,
    price: asMoney(shipment.clientPrice),
    origin: shipment.origin,
    destination: shipment.destination,
    packages: shipment.packages,
    createdAt: shipment.createdAt.toISOString(),
    errorMessage: shipment.errorMessage ?? undefined,
  };
}

export async function createQuote(clientId: string, rawInput: unknown) {
  const input = quoteRequestSchema.parse(rawInput) as QuoteRequestInput;
  const client = await loadActiveClient(clientId);
  const [defaults, provider] = await Promise.all([getDefaultFeeRule(), getActiveProvider()]);
  const fee = feeForClient(defaults, client);

  const origin = await enrichAddress(input.origin);
  const destination = await enrichAddress(input.destination);
  const request = { origin, destination, packages: input.packages };

  const providerRates = await provider.quoteRates(request);
  const priced = providerRates.map((rate) => ({
    ...rate,
    ...applyFee(rate.providerCost, fee),
  }));

  const quote = await prisma.quote.create({
    data: {
      clientId,
      provider: provider.id,
      request,
      expiresAt: new Date(Date.now() + QUOTE_TTL_MS),
      rates: {
        create: priced.map((rate) => ({
          provider: provider.id,
          carrier: rate.carrier,
          service: rate.service,
          serviceName: rate.serviceName,
          deliveryEstimate: rate.deliveryEstimate,
          currency: rate.currency,
          providerCost: rate.providerCost,
          feeAmount: rate.feeAmount,
          clientPrice: rate.clientPrice,
          raw: rate.raw as Prisma.InputJsonValue | undefined,
        })),
      },
    },
    include: { rates: true },
  });

  return toPublicQuote(quote);
}

export async function purchaseFromQuote(clientId: string, quoteId: string, rateId: string) {
  const client = await loadActiveClient(clientId);
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, clientId },
    include: { rates: true, shipment: true },
  });

  if (!quote) {
    throw new AppError("Cotización no encontrada", 404, "QUOTE_NOT_FOUND");
  }
  if (quote.shipment) {
    throw new AppError("Esta cotización ya fue convertida en guía", 409, "QUOTE_USED");
  }
  if (quote.status === "EXPIRED" || quote.expiresAt.getTime() < Date.now()) {
    await prisma.quote.update({
      where: { id: quote.id },
      data: { status: "EXPIRED" },
    });
    throw new AppError("La cotización expiró. Solicita una nueva.", 410, "QUOTE_EXPIRED");
  }

  const rate = quote.rates.find((item) => item.id === rateId);
  if (!rate) {
    throw new AppError("Tarifa no encontrada en la cotización", 404, "RATE_NOT_FOUND");
  }

  const request = quote.request as QuoteRequestInput;
  const provider = await getActiveProvider();
  const defaults = await getDefaultFeeRule();
  const fee = feeForClient(defaults, client);
  const chargeMxn = asMoney(rate.clientPrice);

  assertSufficientBalance(asMoney(client.balanceMxn), chargeMxn);

  let reservedMxn: number | null = null;
  try {
    await reserveClientFunds(prisma, clientId, chargeMxn);
    reservedMxn = chargeMxn;

    const label = await provider.generateLabel({
      ...request,
      carrier: rate.carrier,
      service: rate.service,
    });

    const actualCost = label.providerCost > 0 ? label.providerCost : asMoney(rate.providerCost);
    const priced = applyFee(actualCost, fee);

    const shipment = await prisma.$transaction(async (tx) => {
      const created = await tx.shipment.create({
        data: {
          clientId,
          quoteId: quote.id,
          quoteRateId: rate.id,
          provider: provider.id,
          status: "PURCHASED",
          carrier: label.carrier || rate.carrier,
          service: label.service || rate.service,
          serviceName: rate.serviceName,
          trackingNumber: label.trackingNumber,
          trackingUrl: label.trackingUrl,
          labelUrl: label.labelUrl,
          providerShipmentId: label.providerShipmentId,
          currency: "MXN",
          providerCost: priced.providerCost,
          feeAmount: priced.feeAmount,
          clientPrice: priced.clientPrice,
          origin: request.origin as Prisma.InputJsonValue,
          destination: request.destination as Prisma.InputJsonValue,
          packages: request.packages as Prisma.InputJsonValue,
        },
      });

      await tx.sale.create({
        data: {
          shipmentId: created.id,
          clientId,
          providerCost: priced.providerCost,
          feeAmount: priced.feeAmount,
          clientPrice: priced.clientPrice,
          currency: "MXN",
        },
      });

      await recordPurchaseCharge(tx, {
        clientId,
        amountMxn: chargeMxn,
        shipmentId: created.id,
        note: `Guía ${label.trackingNumber || created.id}`,
      });

      await tx.quote.update({
        where: { id: quote.id },
        data: { status: "CONVERTED" },
      });

      return created;
    });

    reservedMxn = null;
    return toPublicShipment(shipment);
  } catch (error) {
    if (reservedMxn != null) {
      await releaseClientFunds(prisma, clientId, reservedMxn);
      reservedMxn = null;
    }
    if (error instanceof AppError && error.code === "INSUFFICIENT_BALANCE") {
      throw error;
    }
    const message = error instanceof Error ? error.message : "No se pudo comprar la guía";
    await prisma.shipment.create({
      data: {
        clientId,
        provider: provider.id,
        status: "FAILED",
        carrier: rate.carrier,
        service: rate.service,
        serviceName: rate.serviceName,
        currency: "MXN",
        providerCost: rate.providerCost,
        feeAmount: rate.feeAmount,
        clientPrice: rate.clientPrice,
        origin: request.origin as Prisma.InputJsonValue,
        destination: request.destination as Prisma.InputJsonValue,
        packages: request.packages as Prisma.InputJsonValue,
        errorMessage: message,
      },
    });
    throw error;
  }
}

export async function getShipment(clientId: string, shipmentId: string, opts?: { admin?: boolean }) {
  const shipment = await prisma.shipment.findFirst({
    where: opts?.admin ? { id: shipmentId } : { id: shipmentId, clientId },
    include: { sale: true, client: { include: { user: true } } },
  });
  if (!shipment) {
    throw new AppError("Envío no encontrado", 404, "SHIPMENT_NOT_FOUND");
  }
  if (opts?.admin) {
    return {
      ...toPublicShipment(shipment),
      providerCost: asMoney(shipment.providerCost),
      feeAmount: asMoney(shipment.feeAmount),
      clientName: shipment.client.companyName,
      clientEmail: shipment.client.user.email,
    };
  }
  return toPublicShipment(shipment);
}

export async function listShipments(clientId: string) {
  const rows = await prisma.shipment.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(toPublicShipment);
}

export async function getShipmentTracking(clientId: string, shipmentId: string) {
  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, clientId },
  });
  if (!shipment) {
    throw new AppError("Envío no encontrado", 404, "SHIPMENT_NOT_FOUND");
  }
  if (!shipment.trackingNumber) {
    return {
      trackingNumber: "",
      status: shipment.status === "PURCHASED" ? "Created" : shipment.status,
      events: [] as Array<{ description: string; date?: string }>,
    };
  }
  const provider = await getActiveProvider();
  const rows = await provider.track([shipment.trackingNumber]);
  return (
    rows[0] ?? {
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      events: [],
    }
  );
}

export async function getAdminDashboardStats() {
  const [saleAgg, purchasedCount, failedCount, activeClients, recent] = await Promise.all([
    prisma.sale.aggregate({
      _count: { _all: true },
      _sum: { feeAmount: true, clientPrice: true, providerCost: true },
    }),
    prisma.shipment.count({ where: { status: "PURCHASED" } }),
    prisma.shipment.count({ where: { status: "FAILED" } }),
    prisma.client.count({ where: { active: true } }),
    prisma.shipment.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { client: { include: { user: true } } },
    }),
  ]);

  return {
    salesCount: saleAgg._count._all,
    marginTotal: asMoney(Number(saleAgg._sum.feeAmount ?? 0)),
    revenueTotal: asMoney(Number(saleAgg._sum.clientPrice ?? 0)),
    costTotal: asMoney(Number(saleAgg._sum.providerCost ?? 0)),
    purchasedCount,
    failedCount,
    activeClients,
    recent: recent.map((shipment) => ({
      ...toPublicShipment(shipment),
      providerCost: asMoney(shipment.providerCost),
      feeAmount: asMoney(shipment.feeAmount),
      clientName: shipment.client.companyName,
      clientEmail: shipment.client.user.email,
    })),
  };
}

export async function listAllShipments() {
  const rows = await prisma.shipment.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { client: { include: { user: true } } },
  });
  return rows.map((shipment) => ({
    ...toPublicShipment(shipment),
    providerCost: asMoney(shipment.providerCost),
    feeAmount: asMoney(shipment.feeAmount),
    clientName: shipment.client.companyName,
    clientEmail: shipment.client.user.email,
  }));
}
