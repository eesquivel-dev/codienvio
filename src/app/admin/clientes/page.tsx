import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { asMoney, formatMxn } from "@/lib/money";
import { ClientsManager } from "@/app/admin/clientes/clients-manager";
import { PageHeader } from "@/components/page-header";

export default async function ClientsPage() {
  await requireAdmin();
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      apiKeys: { orderBy: { createdAt: "desc" } },
      walletTxns: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes y API keys"
        description="Crea cuentas, carga saldo prepagado y genera API keys. La key completa solo se muestra una vez; después solo verás el prefijo."
      />
      <ClientsManager
        clients={clients.map((client) => ({
          id: client.id,
          companyName: client.companyName,
          email: client.user.email,
          name: client.user.name,
          active: client.active,
          feePercent: client.feePercent === null ? null : Number(client.feePercent),
          feeFixedMxn: client.feeFixedMxn === null ? null : Number(client.feeFixedMxn),
          balanceMxn: asMoney(client.balanceMxn),
          balanceLabel: formatMxn(asMoney(client.balanceMxn)),
          ledger: client.walletTxns.map((row) => ({
            id: row.id,
            type: row.type,
            amountMxn: asMoney(row.amountMxn),
            note: row.note,
            shipmentId: row.shipmentId,
            createdAt: row.createdAt.toISOString(),
          })),
          keys: client.apiKeys.map((key) => ({
            id: key.id,
            name: key.name,
            prefix: key.prefix,
            revoked: Boolean(key.revokedAt),
          })),
        }))}
      />
    </div>
  );
}
