import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ExternalLink, MapPin, Package } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireClient } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { carrierLabel, formatDateTimeMx, trackingStatusLabel } from "@/lib/format";
import { formatMxn } from "@/lib/money";
import { getShipment, getShipmentTracking } from "@/lib/services/shipping";

type AddressView = {
  name?: string;
  company?: string;
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phone?: string;
};

type PackageView = {
  content?: string;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  declaredValueMxn?: number;
};

function formatAddress(address: AddressView) {
  return [
    address.name,
    address.company,
    [address.street, address.number].filter(Boolean).join(" "),
    address.district,
    [address.city, address.state, address.postalCode].filter(Boolean).join(", "),
    address.phone,
  ]
    .filter(Boolean)
    .join(" · ");
}

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

  let tracking: { status: string; events: Array<{ description: string; date?: string }> } | null =
    null;
  try {
    tracking = await getShipmentTracking(session.user.clientId!, id);
  } catch {
    tracking = null;
  }

  const origin = shipment.origin as AddressView;
  const destination = shipment.destination as AddressView;
  const packages = (Array.isArray(shipment.packages) ? shipment.packages : []) as PackageView[];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Guía ${shipment.trackingNumber ?? shipment.id.slice(0, 8)}`}
        description={`${carrierLabel(shipment.carrier)} · ${shipment.serviceName ?? shipment.service} · ${formatDateTimeMx(shipment.createdAt)}`}
        actions={
          <Button asChild variant="outline">
            <Link href="/portal/envios">← Mis envíos</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Estado</span>
              <StatusBadge status={shipment.status} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Paquetería</span>
              <span className="font-medium">{carrierLabel(shipment.carrier)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Servicio</span>
              <span>{shipment.serviceName ?? shipment.service}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Precio</span>
              <span className="font-semibold tabular-nums">{formatMxn(shipment.price)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Rastreo</span>
              <span className="font-mono text-xs">{shipment.trackingNumber ?? "—"}</span>
            </div>
            {tracking ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Rastreo actual</span>
                <span>{trackingStatusLabel(tracking.status)}</span>
              </div>
            ) : null}
            {shipment.errorMessage ? (
              <p className="rounded-md bg-destructive/5 px-3 py-2 text-destructive">
                {shipment.errorMessage}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-2">
              {shipment.trackingUrl ? (
                <Button asChild variant="outline">
                  <a href={shipment.trackingUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Ver rastreo
                  </a>
                </Button>
              ) : null}
              {shipment.labelUrl ? (
                <Button asChild>
                  <a href={shipment.labelUrl} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4" />
                    Descargar PDF
                  </a>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ruta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="type-overline text-muted-foreground">Origen</p>
                <p>{formatAddress(origin)}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="type-overline text-muted-foreground">Destino</p>
                <p>{formatAddress(destination)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {packages.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Paquete
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            {packages.map((item, index) => (
              <div key={index} className="rounded-lg bg-muted/50 p-3">
                <p className="font-medium">{item.content || "Paquete"}</p>
                <p className="text-muted-foreground">
                  {item.weightKg} kg · {item.lengthCm}×{item.widthCm}×{item.heightCm} cm
                  {item.declaredValueMxn != null
                    ? ` · valor ${formatMxn(item.declaredValueMxn)}`
                    : null}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {tracking?.events?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Eventos de rastreo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {tracking.events.map((event, index) => (
              <p key={index}>
                {event.date ? `${event.date} · ` : null}
                {event.description}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
