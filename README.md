# Código Envío (CodiEnvio)

Plataforma para cotizar, comparar y comprar guías de envío doméstico en **México**. El portal y la API muestran precios claros en MXN. El operador administra clientes, saldo, tarifas e integraciones desde el admin.

Cada cliente tiene **saldo prepagado en MXN**. El admin puede cargarlo a mano y el cliente puede recargarlo desde el portal con **Mercado Pago**: Payment Brick en la página (tarjeta / OXXO / SPEI) o Checkout Pro (cuenta Mercado Pago). Al comprar una guía se cobra `clientPrice` de ese saldo. Fuera de alcance: CFDI de la recarga, recarga automática del monedero del operador, iVoy en vivo y monedas distintas a MXN. Hay un hook de proveedor `iVoy` para más adelante.

## Stack

- Next.js 15 (App Router) + TypeScript
- PostgreSQL + Prisma
- Tailwind CSS + componentes estilo shadcn/ui
- NextAuth (correo/contraseña) y API keys Bearer
- UI en **es-MX**, marca comercial **Código Envío** (navy + lima)

## Identidad de marca

Lockup oficial **CÓDIGO ENVÍO** (wordmark lima + navy, isotipo de camión). Paleta tomada del mark:

| Token | Hex | Uso |
| ----- | --- | --- |
| Navy | `#0B1B4B` | Dominante (encabezados, texto) |
| Lima | `#C4E000` | Acento (CTAs, datos clave, marca) |
| Navy claro | `#1F3E8C` | Fondos y gráficos |
| Gris azulado | `#8FA0B8` | Texto secundario |
| Gris papel | `#F6F7F9` | Fondos alternos |
| Blanco | `#FFFFFF` | Base |

Tipografía: **Poppins** (Bold / SemiBold / Medium / Regular). Fallback Arial / Liberation Sans.

Assets en `public/brand/`:

- `codigo-envio-lockup.png` — lockup primario en campo transparente (también `logo-color.png`)
- `codigo-envio-lockup-on-dark.png` — knockout lima + blanco para chrome navy
- `codigo-envio-icon.png` — isotipo del camión

El lockup se sienta directo sobre navy o papel. No lleva recuadro blanco.

El copy de cliente habla de cotizar, comparar y comprar guías. No usa lenguaje de reventa ni de convenios detrás de escena.

## Arquitectura de proveedores

`src/lib/providers/types.ts` define `ShippingProvider` (`quoteRates`, `generateLabel`, `track`, `lookupZip`).

- **Envia** (`src/lib/providers/envia.ts`): `POST /ship/rate/` (producción exige `shipment.carrier`; CodiEnvio cotiza en paralelo Estafeta, DHL, FedEx, UPS, Paquetexpress y Redpack y fusiona tarifas), `POST /ship/generate/`, `POST /ship/generaltrack/` y Geocodes `GET /zipcode/MX/{cp}`. El modo simulado no llama a Envia.
- **iVoy** (`src/lib/providers/ivoy.ts`): stub que responde `501 PROVIDER_NOT_IMPLEMENTED`.

El token JWT de Envia vive solo en el servidor (cifrado en `Settings` o `ENVIA_TOKEN`). El navegador nunca lo recibe.

## Modelo de comisión

Markup sobre el **costo Envia** (no margen sobre el precio de venta):

`client_price = provider_cost + (provider_cost * %) + cargo_fijo MXN`

- **Regla global por defecto:** 20% del costo Envia y **$0** fijo. Se cambia en Admin → Configuración.
- Override opcional por cliente (porcentaje y/o fijo).
- Se persisten `provider_cost`, `fee_amount` y `client_price` en cotizaciones, envíos y ventas. El cliente solo ve `price`.

## Requisitos

- Node.js 20 or 22 LTS (`.nvmrc` pins 22 for Render / nvm)
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
| Cliente | `bodega@demo.mx`       | `Cliente1234!`|

API key demo:

```
ce_test_demo_cliente_key_do_not_use_in_prod
```

## Portal y admin

Tras `npm run db:seed`, inicia sesión con las cuentas demo.

### Portal (cliente)

- **Inicio**: bienvenida + acción principal **Cotizar envío**.
- **Saldo** (`/portal/saldo`): recarga con Mercado Pago — **Pagar aquí** (Payment Brick: tarjeta, OXXO o SPEI) o **Pagar con Mercado Pago** (Checkout Pro). Un pago `approved` acredita `Client.balanceMxn` y un movimiento `TOP_UP` una sola vez; OXXO/SPEI pendientes los confirma el webhook.
- Saldo prepagado visible en el encabezado y en la cotización. **Comprar guía** exige saldo ≥ precio de venta.
- **Libreta** (`/portal/libreta`): direcciones (origen/destino) y paquetes guardados por cliente. Se eligen o se guardan desde el formulario de cotización.
- Formulario: origen/destino (C.P., ciudad, estado MX), medidas, peso y valor declarado. El botón **Cargar ejemplo CDMX → MTY** rellena un envío de prueba.
- Resultados: compara paqueterías (precio MXN de menor a mayor), selecciona y compra la guía. Si el saldo no alcanza, se muestra el monto faltante y no se llama a Envía.
- **Mis envíos**: historial con búsqueda y filtros (estado, paquetería, rango de fechas, rastreo) y detalle con PDF + rastreo.
- **Libreta** y **Saldo**: listados con búsqueda y filtros (uso/tipo, fechas en movimientos).

### Admin (operador)

Separado del portal de cliente (`/portal`). Navegación:

- **Dashboard** (`/admin`): pantalla de inicio del admin (el login redirige aquí). KPIs del periodo (hoy / 7 días / este mes / todo), comparación vs periodo anterior, desglose por cliente y paquetería, y actividad reciente.
- **Reportes** (`/admin/reportes`): ventas, envíos, recargas de saldo y margen/comisión por cliente, paquetería y día. Filtros + export CSV.
- **Clientes** (`/admin/clientes`): catálogo con búsqueda/filtro, detalle (empresa, comisión, saldo, ledger filtrable, API keys, libreta de direcciones/paquetes en solo lectura) y **Cargar saldo**.
- **Integraciones** (`/admin/integraciones`): estado de Envía (token / env / mock), Mercado Pago (token / public key para Payment Brick, Checkout Pro con el access token, sin secretos) y API keys por cliente (búsqueda + filtro). iVoy sigue como próximo.
- **Facturación** (`/admin/facturacion`): ventas y cargas de saldo, totales (precio cliente, comisión, costo Envía) y estado de cuenta mensual. Búsqueda + filtros. Se puede marcar un mes como *facturado* (sin CFDI).
- **Envíos** (`/admin/envios`): costo Envia, comisión y precio al cliente, con búsqueda, estado, paquetería y rango de fechas.
- **Configuración** (`/admin/configuracion`): token Envia, sandbox/producción, modo simulado, comisión % y cargo fijo MXN.

Fuera de alcance todavía: timbrado CFDI de la recarga.

## Mercado Pago (recarga de saldo)

La recarga financia el **saldo CodiEnvio del cliente**, no el monedero Envía del operador. En `/portal/saldo` el cliente elige:

- **Pagar aquí** — [Payment Brick](https://www.mercadopago.com.mx/developers/es/docs/checkout-bricks/payment-brick/introduction) embebido (tarjeta, OXXO o SPEI). No exige cuenta de Mercado Pago. El vencimiento y el CVV viven en iframes PCI de Mercado Pago: el autocompletado del navegador no puede rellenarlos de forma fiable; el portal pide escribirlos a mano y no intercepta esos campos.
- **Pagar con Mercado Pago** — [Checkout Pro](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/landing) (redirect) para quien prefiere su cuenta, saldo o tarjetas guardadas en Mercado Pago.

Ambas vías crean el mismo `WalletTopUp` y acreditan el saldo una sola vez (`WalletTransaction.mercadopagoPaymentId`).

1. Crea una aplicación en [Tu integración](https://www.mercadopago.com.mx/developers/panel).
2. Copia el **Access Token** y la **Public Key** (usa `TEST-` / `APP_USR-` de prueba en sandbox).
3. En producción, configura un webhook `payment` hacia `https://<tu-dominio>/api/webhooks/mercadopago` y pega el secret en `MERCADOPAGO_WEBHOOK_SECRET`.
4. Define en el entorno (nunca en git):

```
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_PUBLIC_KEY=
MERCADOPAGO_WEBHOOK_SECRET=
```

5. **Public key en el navegador:** `MERCADOPAGO_PUBLIC_KEY` se envía al cliente solo para inicializar Payment Brick (`https://sdk.mercadopago.com/js/v2`). No es un secreto. El **access token nunca sale del servidor**: crea el pago (`POST /v1/payments`), la preferencia de Checkout Pro (`POST /checkout/preferences`) y consulta el webhook.
6. `NEXTAUTH_URL` debe ser la URL pública (HTTPS en producción) para `notification_url` y `back_urls` de Checkout Pro / OXXO / SPEI.
7. Métodos en el Brick: tarjeta de crédito/débito (invitado, una sola exhibición), OXXO y SPEI cuando Mercado Pago los ofrezca. El login de Mercado Pago es la pestaña **Pagar con Mercado Pago**, no un método extra del Brick.
8. Sin access token el portal muestra un error en español. Sin public key, Checkout Pro sigue disponible y el Brick no. Admin → Integraciones marca **En vivo** si están las dos.

Un pago `approved` (Brick inmediato o Checkout Pro al regresar / webhook) acredita el saldo una sola vez. El webhook y `/portal/saldo?payment_id=` consultan el pago en la API de Mercado Pago (no confían en el monto del navegador) y usan `WalletTransaction.mercadopagoPaymentId` como clave de idempotencia. OXXO/SPEI quedan `pending` hasta que el comprador pague; entonces el webhook acredita una sola vez.

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
