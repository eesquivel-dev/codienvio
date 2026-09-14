import { BillingConsole } from "@/app/admin/facturacion/billing-console";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import { listAdminBillingData, mxCalendarMonth } from "@/lib/billing";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; kind?: string; clientId?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const data = await listAdminBillingData();
  const current = mxCalendarMonth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facturación"
        description="Ventas (guías) y movimientos de saldo por cliente, incluidas recargas de Mercado Pago. Costo Envía y comisión solo se ven aquí. El CFDI de la recarga queda fuera de este alcance."
        backHref="/admin"
      />
      <BillingConsole
        events={data.events}
        clients={data.clients}
        periods={data.periods}
        defaultYear={current.year}
        defaultMonth={current.month}
        defaultFrom={current.from}
        defaultTo={current.to}
        initialFrom={params.from}
        initialTo={params.to}
        initialKind={params.kind}
        initialClientId={params.clientId}
      />
    </div>
  );
}
