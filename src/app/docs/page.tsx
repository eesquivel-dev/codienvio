import Link from "next/link";
import { headers } from "next/headers";
import { resolveBaseUrl } from "@/lib/base-url";
import { BackLink } from "@/components/back-link";
import { BrandMark } from "@/components/brand-mark";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DocsPage() {
  const baseUrl = resolveBaseUrl(await headers());
  return (
    <main className="min-h-screen bg-papel">
      <header className="bg-navy">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <BrandMark href="/" variant="on-dark" size="sm" />
          <Link href="/login" className="text-[0.8125rem] font-semibold tracking-[-0.011em] text-lima hover:underline">
            Iniciar sesión
          </Link>
        </div>
        <div className="h-0.5 bg-lima" aria-hidden />
      </header>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
        <div>
          <BackLink href="/" label="Volver" />
          <h1 className="type-display-sm mt-2 text-navy">API pública v1</h1>
          <div className="mt-2 h-1 w-10 bg-lima" aria-hidden />
          <p className="type-body mt-2 text-muted-foreground">
            Autenticación con API key por cliente. Cotiza, compra guías y consulta envíos. Las
            respuestas incluyen el <code>price</code> en MXN.
          </p>
          <p className="mt-2 text-sm">
            OpenAPI:{" "}
            <a className="underline" href="/openapi.yaml">
              /openapi.yaml
            </a>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Autenticación</CardTitle>
            <CardDescription>
              Genera, copia o regenera tu key en{" "}
              <Link className="underline" href="/portal/api">Portal → API</Link> (con sesión de cliente) y prueba una cotización ahí mismo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-navy p-4 text-xs text-white">
              {`Authorization: Bearer ce_live_...`}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>POST /v1/rates</CardTitle>
            <CardDescription>Cotiza un envío doméstico MX y persiste la cotización.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-navy p-4 text-xs text-white">
              {`curl -X POST ${baseUrl}/v1/rates \\
  -H "Authorization: Bearer $CODIENVIO_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "origin": {
      "name": "Edgar Esquivel",
      "phone": "5551234567",
      "street": "Av. Insurgentes Sur",
      "number": "1647",
      "city": "Ciudad de México",
      "state": "CX",
      "postalCode": "03920",
      "country": "MX"
    },
    "destination": {
      "name": "Ana López",
      "phone": "8181234567",
      "street": "Av. Constitución",
      "number": "123",
      "city": "Monterrey",
      "state": "NL",
      "postalCode": "64060",
      "country": "MX"
    },
    "packages": [{
      "type": "box",
      "content": "Ropa",
      "weightKg": 0.5,
      "lengthCm": 30,
      "widthCm": 20,
      "heightCm": 10,
      "declaredValueMxn": 450
    }]
  }'`}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>POST /v1/shipments</CardTitle>
            <CardDescription>
              Compra la guía a partir de quoteId + rateId. Se cobra de tu saldo prepagado. Si no
              alcanza, responde 402.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-navy p-4 text-xs text-white">
              {`curl -X POST ${baseUrl}/v1/shipments \\
  -H "Authorization: Bearer $CODIENVIO_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"quoteId":"...", "rateId":"..."}'`}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>GET /v1/shipments/:id</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-navy p-4 text-xs text-white">
              {`curl ${baseUrl}/v1/shipments/SHIPMENT_ID \\
  -H "Authorization: Bearer $CODIENVIO_API_KEY"`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
