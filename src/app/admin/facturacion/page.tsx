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
        description="Ventas (guías) y movimientos de saldo por cliente. Costo Envía y comisión solo se ven aquí. Mercado Pago y CFDI vienen después; hoy puedes marcar el mes como facturado."
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
