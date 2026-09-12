import Link from "next/link";
import { ArrowRight, History, Package } from "lucide-react";
import { QuoteForm } from "@/components/quote-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireClient } from "@/lib/auth";
import { formatDateTimeMx } from "@/lib/format";
import { formatMxn } from "@/lib/money";
import { listShipments } from "@/lib/services/shipping";

export default async function PortalPage() {
  const session = await requireClient();
  const shipments = await listShipments(session.user.clientId!);
  const purchased = shipments.filter((item) => item.status === "PURCHASED");
  const recent = purchased.slice(0, 3);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-primary">Portal CodiEnvio</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Hola{session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Cotiza un envío doméstico, compara paqueterías y compra la guía. El precio es final en
          MXN; el costo de Envia no se muestra.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <a href="#cotizar">
              Cotizar envío
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/portal/envios">Ver historial</Link>
          </Button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Card className="border-dashed shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Package className="h-4 w-4" />
                Guías compradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{purchased.length}</p>
            </CardContent>
          </Card>
          <Card className="border-dashed shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <History className="h-4 w-4" />
                Último envío
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">
                {recent[0] ? formatDateTimeMx(recent[0].createdAt) : "Aún no hay envíos"}
              </p>
              {recent[0] ? (
                <p className="text-xs text-muted-foreground">{formatMxn(recent[0].price)}</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
        {recent.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm">
            {recent.map((item) => (
              <li key={item.id}>
                <Link className="text-primary hover:underline" href={`/portal/envios/${item.id}`}>
                  {item.trackingNumber ?? item.id} · {formatMxn(item.price)}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section id="cotizar" className="scroll-mt-24 space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Cotizar envío</h2>
          <p className="text-sm text-muted-foreground">
            Completa origen, destino y medidas. Si solo quieres probar, usa el ejemplo CDMX → MTY.
          </p>
        </div>
        <QuoteForm />
      </section>
    </div>
  );
}
