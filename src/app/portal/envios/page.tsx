import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { formatMxn } from "@/lib/money";
import { listShipments } from "@/lib/services/shipping";
import { KeyFigure } from "@/components/key-figure";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function PortalShipmentsPage() {
  const session = await requireClient();
  const shipments = await listShipments(session.user.clientId!);

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Portal cliente"
        title="Mis envíos"
        description="Guías compradas y su precio final."
      />
      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Paquetería</TableHead>
                <TableHead>Rastreo</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Todavía no compras una guía.{" "}
                    <Link className="underline" href="/portal">
                      Cotizar ahora
                    </Link>
                  </TableCell>
                </TableRow>
              ) : (
                shipments.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link className="underline" href={`/portal/envios/${item.id}`}>
                        {new Date(item.createdAt).toLocaleString("es-MX")}
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize">{item.carrier}</TableCell>
                    <TableCell>{item.trackingNumber ?? "—"}</TableCell>
                    <TableCell>
                      <KeyFigure>{formatMxn(item.price)}</KeyFigure>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.status === "PURCHASED" ? "success" : "destructive"}>
                        {item.status === "PURCHASED" ? "Comprada" : "Fallida"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
