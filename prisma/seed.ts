import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { hashApiKey } from "../src/lib/api-keys";

config();

const prisma = new PrismaClient();

const DEMO_API_KEY = "ce_test_demo_cliente_key_do_not_use_in_prod";

/** Only these two known demo emails are reset on every seed. */
const DEMO_ADMIN_EMAIL = "admin@codienvio.mx";
const DEMO_ADMIN_PASSWORD = "Admin1234!";
const DEMO_CLIENT_EMAIL = "cliente@demo.mx";
const DEMO_CLIENT_PASSWORD = "Cliente1234!";

const DEFAULT_FEE_PERCENT = 20;
const DEFAULT_FEE_FIXED_MXN = 0;

async function upsertDemoAddress(
  clientId: string,
  data: {
    label: string;
    type: "ORIGIN" | "DESTINATION" | "BOTH";
    name: string;
    company: string;
    phone: string;
    email: string;
    street: string;
    number: string;
    district: string;
    city: string;
    state: string;
    postalCode: string;
    reference: string;
  },
) {
  const existing = await prisma.savedAddress.findFirst({
    where: { clientId, label: data.label },
  });
  if (existing) {
    await prisma.savedAddress.update({ where: { id: existing.id }, data });
    return;
  }
  await prisma.savedAddress.create({ data: { clientId, ...data } });
}

async function upsertDemoPackage(
  clientId: string,
  data: {
    nickname: string;
    type: string;
    content: string;
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    declaredValueMxn: number;
  },
) {
  const existing = await prisma.savedPackage.findFirst({
    where: { clientId, nickname: data.nickname },
  });
  if (existing) {
    await prisma.savedPackage.update({ where: { id: existing.id }, data });
    return;
  }
  await prisma.savedPackage.create({ data: { clientId, ...data } });
}

async function main() {
  await prisma.settings.upsert({
    where: { id: "default" },
    update: {
      defaultFeePercent: DEFAULT_FEE_PERCENT,
      defaultFeeFixedMxn: DEFAULT_FEE_FIXED_MXN,
    },
    create: {
      id: "default",
      enviaEnvironment: "sandbox",
      defaultFeePercent: DEFAULT_FEE_PERCENT,
      defaultFeeFixedMxn: DEFAULT_FEE_FIXED_MXN,
      mockMode: process.env.ENVIA_MOCK === "true" || !process.env.ENVIA_TOKEN,
    },
  });

  const adminPasswordHash = await hash(DEMO_ADMIN_PASSWORD, 12);
  const clientPasswordHash = await hash(DEMO_CLIENT_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: DEMO_ADMIN_EMAIL },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: DEMO_ADMIN_EMAIL,
      name: "Edgar Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  const clientUser = await prisma.user.upsert({
    where: { email: DEMO_CLIENT_EMAIL },
    update: { passwordHash: clientPasswordHash },
    create: {
      email: DEMO_CLIENT_EMAIL,
      name: "Cliente Demo",
      passwordHash: clientPasswordHash,
      role: "CLIENT",
      client: {
        create: {
          companyName: "Tienda Demo MX",
          feePercent: null,
          feeFixedMxn: null,
          balanceMxn: 0,
        },
      },
    },
    include: { client: true },
  });

  const clientId =
    clientUser.client?.id ??
    (await prisma.client.findUniqueOrThrow({ where: { userId: clientUser.id } })).id;

  await prisma.apiKey.upsert({
    where: { hash: hashApiKey(DEMO_API_KEY) },
    update: { revokedAt: null },
    create: {
      clientId,
      name: "Demo",
      prefix: DEMO_API_KEY.slice(0, 16),
      hash: hashApiKey(DEMO_API_KEY),
    },
  });

  await upsertDemoAddress(clientId, {
    label: "Bodega CDMX",
    type: "ORIGIN",
    name: "Edgar Esquivel",
    company: "Tienda Demo MX",
    phone: "5551234567",
    email: "edgar@codienvio.mx",
    street: "Av. Insurgentes Sur",
    number: "1647",
    district: "Insurgentes Mixcoac",
    city: "Ciudad de México",
    state: "CX",
    postalCode: "03920",
    reference: "Local 3",
  });
  await upsertDemoAddress(clientId, {
    label: "Cliente Monterrey",
    type: "DESTINATION",
    name: "Ana López",
    company: "",
    phone: "8181234567",
    email: "ana@example.com",
    street: "Av. Constitución",
    number: "123",
    district: "Centro",
    city: "Monterrey",
    state: "NL",
    postalCode: "64060",
    reference: "",
  });
  await upsertDemoPackage(clientId, {
    nickname: "Caja ropa",
    type: "box",
    content: "Ropa",
    weightKg: 0.5,
    lengthCm: 30,
    widthCm: 20,
    heightCm: 10,
    declaredValueMxn: 450,
  });

  const norteUser = await prisma.user.upsert({
    where: { email: "bodega@demo.mx" },
    update: { passwordHash: clientPasswordHash },
    create: {
      email: "bodega@demo.mx",
      name: "Bodega Norte",
      passwordHash: clientPasswordHash,
      role: "CLIENT",
      client: {
        create: {
          companyName: "Bodega Norte",
          feePercent: null,
          feeFixedMxn: null,
          balanceMxn: 0,
        },
      },
    },
    include: { client: true },
  });
  const norteId =
    norteUser.client?.id ??
    (await prisma.client.findUniqueOrThrow({ where: { userId: norteUser.id } })).id;

  await seedDemoOperations(clientId, norteId);

  console.log("Seed listo.");
  console.log(`Admin:   ${DEMO_ADMIN_EMAIL} / ${DEMO_ADMIN_PASSWORD}`);
  console.log(`Cliente: ${DEMO_CLIENT_EMAIL} / ${DEMO_CLIENT_PASSWORD}`);
  console.log(`Cliente: bodega@demo.mx / ${DEMO_CLIENT_PASSWORD}`);
  console.log(`API key: ${DEMO_API_KEY}`);
  console.log(`Admin id: ${admin.id}`);
  console.log("Saldo demo: recarga en Portal → Saldo o carga en Admin → Clientes. El seed deja operaciones de ejemplo para Dashboard / Reportes.");
}

const SAMPLE_ORIGIN = {
  name: "Edgar Esquivel",
  phone: "5551234567",
  street: "Av. Insurgentes Sur",
  number: "1647",
  city: "Ciudad de México",
  state: "CX",
  postalCode: "03920",
  country: "MX",
};

const SAMPLE_DESTINATION = {
  name: "Ana López",
  phone: "8181234567",
  street: "Av. Constitución",
  number: "123",
  city: "Monterrey",
  state: "NL",
  postalCode: "64060",
  country: "MX",
};

const SAMPLE_PACKAGE = [
  {
    type: "box",
    content: "Ropa",
    weightKg: 0.5,
    lengthCm: 30,
    widthCm: 20,
    heightCm: 10,
    declaredValueMxn: 450,
  },
];

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

async function seedDemoOperations(demoClientId: string, norteId: string) {
  const already = await prisma.shipment.findFirst({
    where: { trackingNumber: "CE-DEMO-001" },
    select: { id: true },
  });
  if (already) return;

  async function purchased(params: {
    clientId: string;
    carrier: string;
    service: string;
    serviceName: string;
    tracking: string;
    cost: number;
    fee: number;
    price: number;
    createdAt: Date;
  }) {
    const shipment = await prisma.shipment.create({
      data: {
        clientId: params.clientId,
        provider: "envia",
        status: "PURCHASED",
        carrier: params.carrier,
        service: params.service,
        serviceName: params.serviceName,
        trackingNumber: params.tracking,
        trackingUrl: `https://example.com/track/${params.tracking}`,
        currency: "MXN",
        providerCost: params.cost,
        feeAmount: params.fee,
        clientPrice: params.price,
        origin: SAMPLE_ORIGIN,
        destination: SAMPLE_DESTINATION,
        packages: SAMPLE_PACKAGE,
        createdAt: params.createdAt,
        updatedAt: params.createdAt,
      },
    });
    await prisma.sale.create({
      data: {
        shipmentId: shipment.id,
        clientId: params.clientId,
        providerCost: params.cost,
        feeAmount: params.fee,
        clientPrice: params.price,
        createdAt: params.createdAt,
      },
    });
    await prisma.walletTransaction.create({
      data: {
        clientId: params.clientId,
        amountMxn: -params.price,
        type: "PURCHASE",
        shipmentId: shipment.id,
        note: `Guía ${params.tracking}`,
        createdAt: params.createdAt,
      },
    });
  }

  await prisma.walletTransaction.create({
    data: {
      clientId: demoClientId,
      amountMxn: 5000,
      type: "TOP_UP",
      note: "Carga inicial demo",
      createdAt: daysAgo(12),
    },
  });
  await purchased({
    clientId: demoClientId,
    carrier: "estafeta",
    service: "ground",
    serviceName: "Terrestre",
    tracking: "CE-DEMO-001",
    cost: 150,
    fee: 30,
    price: 180,
    createdAt: daysAgo(10),
  });
  await purchased({
    clientId: demoClientId,
    carrier: "dhl",
    service: "express",
    serviceName: "Express",
    tracking: "CE-DEMO-002",
    cost: 200,
    fee: 40,
    price: 240,
    createdAt: daysAgo(5),
  });
  await purchased({
    clientId: demoClientId,
    carrier: "fedex",
    service: "ground",
    serviceName: "Económico",
    tracking: "CE-DEMO-003",
    cost: 120,
    fee: 24,
    price: 144,
    createdAt: daysAgo(2),
  });
  await purchased({
    clientId: demoClientId,
    carrier: "ups",
    service: "ground",
    serviceName: "Saver",
    tracking: "CE-DEMO-004",
    cost: 80,
    fee: 16,
    price: 96,
    createdAt: daysAgo(0),
  });
  await prisma.shipment.create({
    data: {
      clientId: demoClientId,
      provider: "envia",
      status: "FAILED",
      carrier: "redpack",
      service: "ground",
      serviceName: "Terrestre",
      currency: "MXN",
      providerCost: 90,
      feeAmount: 18,
      clientPrice: 108,
      origin: SAMPLE_ORIGIN,
      destination: SAMPLE_DESTINATION,
      packages: SAMPLE_PACKAGE,
      errorMessage: "La paquetería no pudo generar la guía (demo).",
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },
  });
  await prisma.walletTransaction.create({
    data: {
      clientId: demoClientId,
      amountMxn: -50,
      type: "ADJUSTMENT",
      note: "Ajuste demo",
      createdAt: daysAgo(1),
    },
  });

  await prisma.walletTransaction.create({
    data: {
      clientId: norteId,
      amountMxn: 2000,
      type: "TOP_UP",
      note: "Carga Bodega Norte",
      createdAt: daysAgo(8),
    },
  });
  await purchased({
    clientId: norteId,
    carrier: "paquetexpress",
    service: "ground",
    serviceName: "Terrestre",
    tracking: "CE-DEMO-101",
    cost: 180,
    fee: 36,
    price: 216,
    createdAt: daysAgo(4),
  });

  await prisma.client.update({
    where: { id: demoClientId },
    data: { balanceMxn: 4290 },
  });
  await prisma.client.update({
    where: { id: norteId },
    data: { balanceMxn: 1784 },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
