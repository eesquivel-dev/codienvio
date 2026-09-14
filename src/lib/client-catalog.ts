import { asMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { isLowBalance } from "@/lib/dashboard";

export type ClientCatalogRow = {
  id: string;
  companyName: string;
  email: string;
  name: string;
  active: boolean;
  balanceMxn: number;
};

export const CLIENT_CATALOG_LIMIT = 8;

export async function searchClientCatalog(query: string, limit = CLIENT_CATALOG_LIMIT): Promise<ClientCatalogRow[]> {
  const q = query.trim();
  if (!q) return [];

  const rows = await prisma.client.findMany({
    where: {
      OR: [
        { companyName: { contains: q, mode: "insensitive" } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { user: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    orderBy: { companyName: "asc" },
    take: limit,
    include: { user: { select: { email: true, name: true } } },
  });

  return rows.map(toCatalogRow);
}

export async function getClientCatalogById(id: string): Promise<ClientCatalogRow | null> {
  const row = await prisma.client.findUnique({
    where: { id },
    include: { user: { select: { email: true, name: true } } },
  });
  return row ? toCatalogRow(row) : null;
}

export async function countLowBalanceClients(): Promise<number> {
  const rows = await prisma.client.findMany({
    where: { active: true },
    select: { balanceMxn: true },
  });
  return rows.filter((row) => isLowBalance(asMoney(row.balanceMxn))).length;
}

function toCatalogRow(row: {
  id: string;
  companyName: string;
  active: boolean;
  balanceMxn: unknown;
  user: { email: string; name: string };
}): ClientCatalogRow {
  return {
    id: row.id,
    companyName: row.companyName,
    email: row.user.email,
    name: row.user.name,
    active: row.active,
    balanceMxn: asMoney(row.balanceMxn as number | string | { toString(): string }),
  };
}
