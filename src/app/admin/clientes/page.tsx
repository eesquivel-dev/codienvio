import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { asMoney, formatMxn } from "@/lib/money";
import { getDefaultFeeRule } from "@/lib/settings";
import { ClientsManager } from "@/app/admin/clientes/clients-manager";
import { PageHeader } from "@/components/page-header";
import { toSavedAddressDTO, toSavedPackageDTO } from "@/lib/saved-presets";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const [clients, fees] = await Promise.all([
    prisma.client.findMany({
      orderBy: { companyName: "asc" },
      include: {
        user: true,
        apiKeys: { orderBy: { createdAt: "desc" } },
        walletTxns: { orderBy: { createdAt: "desc" }, take: 40 },
        savedAddresses: { orderBy: { updatedAt: "desc" } },
        savedPackages: { orderBy: { updatedAt: "desc" } },
      },
    }),
    getDefaultFeeRule(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Catálogo de cuentas: empresa, comisión, saldo prepagado y API keys. La key completa solo se muestra una vez."
        backHref="/admin"
      />
      <ClientsManager
        defaultFeePercent={fees.percent}
        defaultFeeFixedMxn={fees.fixedMxn}
        initialStatus={params.status}
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
          createdAt: client.createdAt.toISOString(),
          ledger: client.walletTxns.map((row) => ({
            id: row.id,
            type: row.type,
            amountMxn: asMoney(row.amountMxn),
            note: row.note,
            shipmentId: row.shipmentId,
            createdAt: row.createdAt.toISOString(),
          })),
          savedAddresses: client.savedAddresses.map(toSavedAddressDTO),
          savedPackages: client.savedPackages.map(toSavedPackageDTO),
          keys: client.apiKeys.map((key) => ({
            id: key.id,
            name: key.name,
            prefix: key.prefix,
            revoked: Boolean(key.revokedAt),
            lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
          })),
        }))}
      />
    </div>
  );
}
