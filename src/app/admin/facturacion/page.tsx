import { BillingConsole } from "@/app/admin/facturacion/billing-console";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import { listAdminBillingData, mxCalendarMonth } from "@/lib/billing";

export default async function BillingPage() {
  await requireAdmin();
  const data = await listAdminBillingData();
  const current = mxCalendarMonth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facturación"
        description="Ventas (guías) y movimientos de saldo por cliente, incluidas recargas de Mercado Pago. Costo Envía y comisión solo se ven aquí. El CFDI de la recarga queda fuera de este alcance."
      />
      <BillingConsole
        events={data.events}
        clients={data.clients}
        periods={data.periods}
        defaultYear={current.year}
        defaultMonth={current.month}
        defaultFrom={current.from}
        defaultTo={current.to}
      />
    </div>
  );
}
