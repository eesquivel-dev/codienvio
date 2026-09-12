import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ShipmentHistory } from "@/components/shipment-history";
import { Button } from "@/components/ui/button";
import { requireClient } from "@/lib/auth";
import { listShipments } from "@/lib/services/shipping";

export default async function PortalShipmentsPage() {
  const session = await requireClient();
  const shipments = await listShipments(session.user.clientId!);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis envíos"
        description="Historial de guías compradas. Filtra por estado, paquetería o número de rastreo."
        actions={
          <Button asChild>
            <Link href="/portal#cotizar">Cotizar envío</Link>
          </Button>
        }
      />
      <ShipmentHistory shipments={shipments} />
    </div>
  );
}
