# CodiEnvio

Revendedor de guías de envío para **México**, integrado con **Envia.com**. Edgar cotiza y compra con su cuenta negociada; los clientes ven solo el **precio final** (comisión incluida) en el portal web o la API REST.

Fuera de alcance: pagos reales, iVoy en vivo y monedas distintas a MXN. Hay un stub de saldo por cliente y un hook de proveedor `iVoy` para más adelante.

## Stack

- Next.js 15 (App Router) + TypeScript
- PostgreSQL + Prisma
- Tailwind CSS + componentes estilo shadcn/ui
- NextAuth (correo/contraseña) y API keys Bearer
- UI en **es-MX**

## Arquitectura de proveedores

`src/lib/providers/types.ts` define `ShippingProvider` (`quoteRates`, `generateLabel`, `track`, `lookupZip`).

- **Envia** (`src/lib/providers/envia.ts`): `POST /ship/rate/`, `POST /ship/generate/`, `POST /ship/generaltrack/` y Geocodes `GET /zipcode/MX/{cp}`.
- **iVoy** (`src/lib/providers/ivoy.ts`): stub que responde `501 PROVIDER_NOT_IMPLEMENTED`.

El token JWT de Envia vive solo en el servidor (cifrado en `Settings` o `ENVIA_TOKEN`). El navegador nunca lo recibe.

## Modelo de comisión

`client_price = provider_cost + (provider_cost * %) + cargo_fijo MXN`

- Regla global en Admin.
- Override opcional por cliente (porcentaje y/o fijo).
- Se persisten `provider_cost`, `fee_amount` y `client_price` en cotizaciones, envíos y ventas. El cliente solo ve `price`.

## Requisitos

- Node.js 20+
- Docker + Docker Compose (Postgres)
- Token sandbox de Envia (opcional: modo simulado)

## Arranque local

```bash
cp .env.example .env
# Edita NEXTAUTH_SECRET / AUTH_SECRET (openssl rand -base64 32)
# Pega ENVIA_TOKEN o deja ENVIA_MOCK=true

docker compose up -d
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Cuentas demo (seed)

| Rol     | Correo                 | Contraseña    |
| ------- | ---------------------- | ------------- |
| Admin   | `admin@codienvio.mx`   | `Admin1234!`  |
| Cliente | `cliente@demo.mx`      | `Cliente1234!`|

API key demo:

```
ce_test_demo_cliente_key_do_not_use_in_prod
```

## Flujo sandbox Envia

1. Crea cuenta en [accounts-sandbox.envia.com](https://accounts-sandbox.envia.com/signup).
2. Copia el token en [shipping-test.envia.com/settings/developers](https://shipping-test.envia.com/settings/developers).
3. En Admin → Configuración pega el token, ambiente **Sandbox**, desactiva modo simulado.
4. En el portal (o `POST /v1/rates`) cotiza CDMX `03920` → Monterrey `64060`.
5. Compra una tarifa. Envia sandbox genera rastreo + PDF (`POST /ship/generate/`).
6. Si no hay token, activa **Modo simulado** o `ENVIA_MOCK=true` para probar el flujo con tarifas y PDF de demo.

Auth Envia: `Authorization: Bearer <JWT>`.

- Sandbox Shipping: `https://api-test.envia.com/`
- Producción Shipping: `https://api.envia.com/`
- Queries sandbox: `https://queries.test.envia.com/`
- Geocodes: `https://geocodes.envia.com/` (sin auth)

## API pública

Documentación: [/docs](http://localhost:3000/docs) · OpenAPI: [/openapi.yaml](http://localhost:3000/openapi.yaml)

```bash
export CODENVIO_API_KEY=ce_test_demo_cliente_key_do_not_use_in_prod

curl -s http://localhost:3000/v1/rates \
  -H "Authorization: Bearer $CODENVIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d @- <<'JSON'
{
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
}
JSON
```

Luego `POST /v1/shipments` con `{ "quoteId", "rateId" }` y `GET /v1/shipments/:id`.

## Scripts

| Script            | Uso                          |
| ----------------- | ---------------------------- |
| `npm run dev`     | Next en `0.0.0.0:3000`       |
| `npm test`        | Vitest                       |
| `npm run db:up`   | Postgres via Compose         |
| `npm run db:seed` | Admin, cliente y API key     |

En producción el servidor HTTP escucha `0.0.0.0:$PORT` (`npm start`).
