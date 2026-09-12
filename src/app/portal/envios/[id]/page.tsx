import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { formatMxn } from "@/lib/money";
import { getShipment } from "@/lib/services/shipping";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireClient();
  const { id } = await params;
  let shipment;
  try {
    shipment = await getShipment(session.user.clientId!, id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }

  const origin = shipment.origin as { name?: string; city?: string; state?: string; postalCode?: string };
  const destination = shipment.destination as {
    name?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/portal/envios" className="text-sm text-muted-foreground hover:underline">
          ← Mis envíos
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy">
          Guía {shipment.trackingNumber ?? shipment.id}
        </h1>
        <div className="mt-2 h-1 w-10 bg-lima" aria-hidden />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Estado:{" "}
              <Badge variant={shipment.status === "PURCHASED" ? "success" : "destructive"}>
                {shipment.status === "PURCHASED" ? "Comprada" : "Fallida"}
              </Badge>
            </p>
            <p className="capitalize">
              {shipment.carrier} · {shipment.serviceName}
            </p>
            <p>Precio: {formatMxn(shipment.price)}</p>
            {shipment.trackingUrl ? (
              <p>
                <a className="underline" href={shipment.trackingUrl} target="_blank" rel="noreferrer">
                  Ver rastreo
                </a>
              </p>
            ) : null}
            {shipment.labelUrl ? (
              <Button asChild>
                <a href={shipment.labelUrl} target="_blank" rel="noreferrer">
                  Descargar PDF
                </a>
              </Button>
            ) : null}
            {shipment.errorMessage ? (
              <p className="text-destructive">{shipment.errorMessage}</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ruta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Origen:</strong> {origin.name} · {origin.city}, {origin.state} {origin.postalCode}
            </p>
            <p>
              <strong>Destino:</strong> {destination.name} · {destination.city}, {destination.state}{" "}
              {destination.postalCode}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
