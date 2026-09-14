import { AdminShipmentsTable } from "@/components/admin-shipments-table";
import { PageHeader } from "@/components/page-header";
import { TrackingBar } from "@/components/tracking-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { clientCopy } from "@/lib/brand-copy";
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
      <Card>
        <CardHeader>
          <CardTitle>{clientCopy.trackTitle}</CardTitle>
          <CardDescription>{clientCopy.trackLead}</CardDescription>
        </CardHeader>
        <CardContent>
          <TrackingBar id="admin-rastreo" />
        </CardContent>
      </Card>
      <AdminShipmentsTable shipments={shipments} />
    </div>
  );
}
