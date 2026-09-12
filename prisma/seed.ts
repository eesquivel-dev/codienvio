import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { hashApiKey } from "../src/lib/api-keys";

config();

const prisma = new PrismaClient();

const DEMO_API_KEY = "ce_test_demo_cliente_key_do_not_use_in_prod";

async function main() {
  await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      enviaEnvironment: "sandbox",
      defaultFeePercent: 15,
      defaultFeeFixedMxn: 10,
      mockMode: process.env.ENVIA_MOCK === "true" || !process.env.ENVIA_TOKEN,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@codienvio.mx" },
    update: {},
    create: {
      email: "admin@codienvio.mx",
      name: "Edgar Admin",
      passwordHash: await hash("Admin1234!", 12),
      role: "ADMIN",
    },
  });

  const clientUser = await prisma.user.upsert({
    where: { email: "cliente@demo.mx" },
    update: {},
    create: {
      email: "cliente@demo.mx",
      name: "Cliente Demo",
      passwordHash: await hash("Cliente1234!", 12),
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
  console.log("Admin:   admin@codienvio.mx / Admin1234!");
  console.log("Cliente: cliente@demo.mx / Cliente1234!");
  console.log(`API key: ${DEMO_API_KEY}`);
  console.log(`Admin id: ${admin.id}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
