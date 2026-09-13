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

  console.log("Seed listo.");
  console.log(`Admin:   ${DEMO_ADMIN_EMAIL} / ${DEMO_ADMIN_PASSWORD}`);
  console.log(`Cliente: ${DEMO_CLIENT_EMAIL} / ${DEMO_CLIENT_PASSWORD}`);
  console.log(`API key: ${DEMO_API_KEY}`);
  console.log(`Admin id: ${admin.id}`);
  console.log("Saldo demo: $0 — recarga en Portal → Saldo (Pagar aquí o Mercado Pago) o carga en Admin → Clientes.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
