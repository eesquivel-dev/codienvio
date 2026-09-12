import Link from "next/link";
import { Package, KeyRound, BadgePercent } from "lucide-react";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HomePage() {
  const session = await auth();
  const href = session?.user?.role === "ADMIN" ? "/admin" : session ? "/portal" : "/login";

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-10 px-6 py-16">
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">México · Envia.com</p>
        <h1 className="text-4xl font-semibold tracking-tight">CodiEnvio</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Cotiza y compra guías de envío doméstico con la cuenta negociada de Envia. El portal y la
          API muestran solo el precio final; el costo del proveedor nunca se expone al cliente.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href={href}>{session ? "Ir al panel" : "Iniciar sesión"}</Link>
          </Button>
          <Button asChild variant="outline">
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
            Tarifas en vivo desde Envia sandbox, comisión configurable y PDF + rastreo al comprar.
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
            Porcentaje y/o cargo fijo en MXN. Se guardan provider_cost, fee_amount y client_price.
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
