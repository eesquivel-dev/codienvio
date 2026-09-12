import Link from "next/link";
import { BadgePercent, KeyRound, Package } from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HomePage() {
  const session = await auth();
  const href = session?.user?.role === "ADMIN" ? "/admin" : session ? "/portal" : "/login";

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-12 px-6 py-16">
      <div className="space-y-5">
        <BrandLockup subtitle="Revendedor de guías para México" size="lg" />
        <p className="text-sm font-medium uppercase tracking-wide text-primary">México · Envia.com</p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Cotiza, compara y compra guías domésticas
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Edgar opera con su cuenta negociada de Envia. Los clientes ven solo el precio final en
          MXN, con comisión incluida. Portal web y API REST.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={href}>{session ? "Ir al panel" : "Iniciar sesión"}</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/docs">Documentación API</Link>
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Package className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Cotiza y compra</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Tarifas en vivo desde Envia, comparación por paquetería y PDF + rastreo al comprar.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <KeyRound className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">API para clientes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            POST /v1/rates, POST /v1/shipments y GET /v1/shipments/:id con API key Bearer.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <BadgePercent className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Comisión por cliente</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Porcentaje y/o cargo fijo en MXN. El costo del proveedor nunca se expone al cliente.
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
