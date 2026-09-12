import { AdminShipmentsTable } from "@/components/admin-shipments-table";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import { listAllShipments } from "@/lib/services/shipping";

export default async function AdminShipmentsPage() {
  await requireAdmin();
  const shipments = await listAllShipments();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Envíos y margen"
        description="Vista admin: costo Envia, comisión y precio al cliente. Los clientes nunca ven el costo del proveedor."
      />
      <AdminShipmentsTable shipments={shipments} />
    </div>
  );
}
