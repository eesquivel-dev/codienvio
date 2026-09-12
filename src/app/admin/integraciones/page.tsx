import { prisma } from "@/lib/prisma";
import { getAdminSettingsView } from "@/app/admin/actions";
import { IntegrationsCatalog } from "@/app/admin/integraciones/integrations-catalog";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";

export default async function IntegrationsPage() {
  await requireAdmin();
  const [settings, clients] = await Promise.all([
    getAdminSettingsView(),
    prisma.client.findMany({
      orderBy: { companyName: "asc" },
      include: {
        user: true,
        apiKeys: { orderBy: { createdAt: "desc" } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integraciones"
        description="Estado de Envía, llaves API por cliente y conectores próximos (iVoy, Mercado Pago). Los secretos se editan en Configuración."
      />
      <IntegrationsCatalog
        envia={{
          environment: settings.enviaEnvironment,
          mockMode: settings.mockMode,
          hasStoredToken: settings.hasStoredToken,
          hasEnvToken: settings.hasEnvToken,
          usingMock: settings.usingMock,
        }}
        clients={clients.map((client) => ({
          id: client.id,
          companyName: client.companyName,
          email: client.user.email,
          active: client.active,
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
