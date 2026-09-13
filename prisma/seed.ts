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
