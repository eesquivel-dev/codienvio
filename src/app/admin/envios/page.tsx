import { requireAdmin } from "@/lib/auth";
import { formatMxn } from "@/lib/money";
import { listAllShipments } from "@/lib/services/shipping";
import { KeyFigure } from "@/components/key-figure";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminShipmentsPage() {
  await requireAdmin();
  const shipments = await listAllShipments();

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Administración"
        title="Envíos y margen"
        description="Vista admin: costo Envia, comisión y precio al cliente."
      />
      <Card>
        <CardHeader>
          <CardTitle>Últimos envíos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Paquetería</TableHead>
                <TableHead>Rastreo</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    Aún no hay envíos.
                  </TableCell>
                </TableRow>
              ) : (
                shipments.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.clientName}</div>
                      <div className="text-xs text-muted-foreground">{item.clientEmail}</div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {item.carrier}
                      <div className="text-xs text-muted-foreground">{item.serviceName}</div>
                    </TableCell>
                    <TableCell>{item.trackingNumber ?? "—"}</TableCell>
                    <TableCell>{formatMxn(item.providerCost)}</TableCell>
                    <TableCell>{formatMxn(item.feeAmount)}</TableCell>
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
