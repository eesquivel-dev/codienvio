import Link from "next/link";
import { Package, KeyRound, BadgePercent } from "lucide-react";
import { auth } from "@/lib/auth";
import { getBrandLogoSrc } from "@/lib/brand-assets";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HomePage() {
  const session = await auth();
  const href = session?.user?.role === "ADMIN" ? "/admin" : session ? "/portal" : "/login";
  const logoSrc = getBrandLogoSrc("onNavy");

  return (
    <main className="min-h-screen bg-navy text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-12 px-6 py-16">
        <div className="space-y-5">
          <BrandMark variant="onNavy" src={logoSrc} />
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-lima">
            Identidad de marca · México · Envia.com
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">CodiEnvio</h1>
          <div className="h-1 w-14 bg-lima" aria-hidden />
          <p className="max-w-2xl text-lg text-white/75">
            Cotiza y compra guías de envío doméstico con la cuenta negociada de Envia. El portal y la
            API muestran solo el precio final; el costo del proveedor nunca se expone al cliente.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={href}>{session ? "Ir al panel" : "Iniciar sesión"}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/docs">Documentación API</Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <Package className="h-5 w-5 text-navy-claro" />
              <CardTitle className="text-base">Cotiza y compra</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Tarifas en vivo desde Envia sandbox, comisión configurable y PDF + rastreo al comprar.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <KeyRound className="h-5 w-5 text-navy-claro" />
              <CardTitle className="text-base">API para clientes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              POST /v1/rates, POST /v1/shipments y GET /v1/shipments/:id con API key Bearer.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <BadgePercent className="h-5 w-5 text-navy-claro" />
              <CardTitle className="text-base">Comisión por cliente</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Porcentaje y/o cargo fijo en MXN. Se guardan provider_cost, fee_amount y client_price.
            </CardContent>
          </Card>
        </div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gris-azulado">
          Presentado por CTI Group · Julio 2026
        </p>
      </div>
    </main>
  );
}
