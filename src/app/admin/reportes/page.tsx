import { ReportsConsole } from "@/app/admin/reportes/reports-console";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import { mxCalendarMonth } from "@/lib/billing";
import { listAdminReportFacts, listReportFilterOptions } from "@/lib/reports-data";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    kind?: string;
    clientId?: string;
    carrier?: string;
  }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const [facts, options, month] = await Promise.all([
    listAdminReportFacts(),
    listReportFilterOptions(),
    Promise.resolve(mxCalendarMonth()),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Ventas, envíos, recargas de saldo y margen por cliente, paquetería y fecha. Exporta CSV para el cierre operativo. Los costos Envía solo se ven aquí."
        backHref="/admin"
      />
      <ReportsConsole
        facts={facts}
        clients={options.clients}
        carriers={options.carriers}
        defaultFrom={month.from}
        defaultTo={month.to}
        initialFrom={params.from}
        initialTo={params.to}
        initialKind={params.kind}
        initialClientId={params.clientId}
        initialCarrier={params.carrier}
      />
    </div>
  );
}
