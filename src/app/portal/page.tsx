import Link from "next/link";
import { ArrowRight, History, Package, Wallet } from "lucide-react";
import { QuoteForm } from "@/components/quote-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireClient } from "@/lib/auth";
import { formatDateTimeMx } from "@/lib/format";
import { formatMxn } from "@/lib/money";
import { listClientPresets } from "@/lib/saved-presets";
import { listShipments } from "@/lib/services/shipping";
import { getClientWallet } from "@/lib/wallet";

export default async function PortalPage() {
  const session = await requireClient();
  const [shipments, wallet, presets] = await Promise.all([
    listShipments(session.user.clientId!),
    getClientWallet(session.user.clientId!),
    listClientPresets(session.user.clientId!),
  ]);
  const purchased = shipments.filter((item) => item.status === "PURCHASED");
  const recent = purchased.slice(0, 3);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-lg border border-navy/10 bg-card p-6 shadow-sm sm:p-8">
        <p className="type-overline text-lima">Portal Código Envío</p>
        <h1 className="type-display-sm mt-2 text-navy">
          Hola{session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}
        </h1>
        <div className="mt-2 h-1 w-10 bg-lima" aria-hidden />
        <p className="type-body mt-3 max-w-2xl text-muted-foreground">
          Cotiza un envío doméstico, compara paqueterías y compra tu guía. Precios claros en MXN,
          saldo listo y rastreo en un solo lugar.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <a href="#cotizar">
              Cotizar envío
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/portal/libreta">Libreta</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/portal/envios">Ver historial</Link>
          </Button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Card className="border-dashed shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[0.8125rem] font-medium tracking-[-0.011em] text-muted-foreground">
                <Wallet className="h-4 w-4" />
                Saldo prepagado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tracking-[-0.03em] tabular-nums text-navy">
                {formatMxn(wallet.balanceMxn)}
              </p>
              <Link href="/portal/saldo" className="type-caption mt-1 inline-block font-semibold text-navy underline underline-offset-2">
                Recargar saldo
              </Link>
            </CardContent>
          </Card>
          <Card className="border-dashed shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[0.8125rem] font-medium tracking-[-0.011em] text-muted-foreground">
                <Package className="h-4 w-4" />
                Guías compradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tracking-[-0.03em] tabular-nums text-navy">{purchased.length}</p>
            </CardContent>
          </Card>
          <Card className="border-dashed shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[0.8125rem] font-medium tracking-[-0.011em] text-muted-foreground">
                <History className="h-4 w-4" />
                Último envío
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium tracking-[-0.011em]">
                {recent[0] ? formatDateTimeMx(recent[0].createdAt) : "Aún no hay envíos"}
              </p>
              {recent[0] ? (
                <p className="type-caption text-muted-foreground">{formatMxn(recent[0].price)}</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
        {recent.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm">
            {recent.map((item) => (
              <li key={item.id}>
                <Link className="font-medium text-navy hover:underline" href={`/portal/envios/${item.id}`}>
                  {item.trackingNumber ?? item.id} · {formatMxn(item.price)}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section id="cotizar" className="scroll-mt-24 space-y-4">
        <div>
          <h2 className="type-title text-navy">Cotizar envío</h2>
          <div className="mt-2 h-1 w-10 bg-lima" aria-hidden />
          <p className="type-body mt-2 text-muted-foreground">
            Completa origen, destino y medidas. Reutiliza tu libreta o, si solo quieres probar, el
            ejemplo CDMX → MTY.
          </p>
        </div>
        <QuoteForm
          balanceMxn={wallet.balanceMxn}
          savedAddresses={presets.addresses}
          savedPackages={presets.packages}
        />
      </section>
    </div>
  );
}
