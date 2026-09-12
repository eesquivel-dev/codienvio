import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DocsPage() {
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
          <Link href="/" className="text-sm text-muted-foreground hover:underline">
            ← CodiEnvio
          </Link>
          <h1 className="type-display-sm mt-2 text-navy">API pública v1</h1>
          <div className="mt-2 h-1 w-10 bg-lima" aria-hidden />
          <p className="type-body mt-2 text-muted-foreground">
            Autenticación con API key por cliente. El token de Envia nunca viaja al cliente. Las
            respuestas solo incluyen <code>price</code> (MXN), nunca el costo del proveedor.
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
            <CardDescription>El admin genera la key en Clientes.</CardDescription>
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
              {`curl -X POST http://localhost:3000/v1/rates \\
  -H "Authorization: Bearer $CODENVIO_API_KEY" \\
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
              Compra la guía a partir de quoteId + rateId. Se cobra el precio de venta del saldo
              prepagado del cliente. Si no alcanza, responde 402 y no llama a Envía.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-navy p-4 text-xs text-white">
              {`curl -X POST http://localhost:3000/v1/shipments \\
  -H "Authorization: Bearer $CODENVIO_API_KEY" \\
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
              {`curl http://localhost:3000/v1/shipments/SHIPMENT_ID \\
  -H "Authorization: Bearer $CODENVIO_API_KEY"`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
