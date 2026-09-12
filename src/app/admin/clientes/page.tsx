import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { formatMxn } from "@/lib/money";
import { ClientsManager } from "@/app/admin/clientes/clients-manager";

export default async function ClientsPage() {
  await requireAdmin();
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      apiKeys: { orderBy: { createdAt: "desc" } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Crea cuentas de portal y genera API keys. La key completa solo se muestra una vez.
        </p>
      </div>
      <ClientsManager
        clients={clients.map((client) => ({
          id: client.id,
          companyName: client.companyName,
          email: client.user.email,
          name: client.user.name,
          active: client.active,
          feePercent: client.feePercent === null ? null : Number(client.feePercent),
          feeFixedMxn: client.feeFixedMxn === null ? null : Number(client.feeFixedMxn),
          balanceLabel: formatMxn(Number(client.balanceMxn)),
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
