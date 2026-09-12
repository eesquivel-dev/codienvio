import Link from "next/link";
import { Package, KeyRound, BadgePercent } from "lucide-react";
import { auth } from "@/lib/auth";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HomePage() {
  const session = await auth();
  const href = session?.user?.role === "ADMIN" ? "/admin" : session ? "/portal" : "/login";

  return (
    <main className="min-h-screen bg-papel">
      <section className="bg-navy text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-16 sm:py-20">
          <div className="flex items-center justify-between">
            <BrandMark variant="on-dark" size="lg" />
            <p className="hidden text-[10px] font-medium uppercase tracking-[0.16em] text-lima sm:block">
              México · Envia.com
            </p>
          </div>
          <div className="max-w-2xl space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-lima sm:hidden">
              México · Envia.com
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Guías de envío con precio final
            </h1>
            <div className="h-1 w-12 bg-lima" aria-hidden />
            <p className="text-lg text-white/75">
              Cotiza y compra envíos domésticos con la cuenta negociada de Envia. El portal y la
              API muestran solo el precio final; el costo del proveedor nunca se expone al cliente.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild>
                <Link href={href}>{session ? "Ir al panel" : "Iniciar sesión"}</Link>
              </Button>
              <Button asChild variant="inverse">
                <Link href="/docs">Documentación API</Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="h-0.5 bg-lima" aria-hidden />
      </section>
      <section className="mx-auto grid max-w-5xl gap-4 px-6 py-12 md:grid-cols-3">
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
      </section>
    </main>
  );
}
