import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <div>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← CodiEnvio
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">API pública v1</h1>
        <p className="mt-2 text-muted-foreground">
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
          <pre className="overflow-x-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">
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
          <pre className="overflow-x-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">
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
          <CardDescription>Compra la guía a partir de quoteId + rateId.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">
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
          <pre className="overflow-x-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">
            {`curl http://localhost:3000/v1/shipments/SHIPMENT_ID \\
  -H "Authorization: Bearer $CODENVIO_API_KEY"`}
          </pre>
        </CardContent>
      </Card>
    </main>
  );
}
