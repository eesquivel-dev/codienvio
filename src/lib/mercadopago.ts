import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/errors";
import { asMoney } from "@/lib/money";

const MP_API_BASE = "https://api.mercadopago.com";

export type MercadoPagoStatus = {
  configured: boolean;
  hasAccessToken: boolean;
  hasPublicKey: boolean;
  hasWebhookSecret: boolean;
};

export type MercadoPagoPayment = {
  id: string;
  status: string;
  transaction_amount: number;
  currency_id: string;
  external_reference: string | null;
  metadata: Record<string, unknown> | null;
};

export type MercadoPagoPreference = {
  id: string;
  checkoutUrl: string;
};

export function getMercadoPagoStatus(): MercadoPagoStatus {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() ?? "";
  const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY?.trim() ?? "";
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() ?? "";
  return {
    hasAccessToken: Boolean(accessToken),
    hasPublicKey: Boolean(publicKey),
    hasWebhookSecret: Boolean(webhookSecret),
    configured: Boolean(accessToken),
  };
}

export function assertMercadoPagoConfigured(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() ?? "";
  if (!token) {
    throw new AppError(
      "Mercado Pago no está configurado. Pide a tu administrador que agregue MERCADOPAGO_ACCESS_TOKEN.",
      503,
      "MERCADOPAGO_NOT_CONFIGURED",
    );
  }
  return token;
}

export function appBaseUrl(): string {
  const raw = process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function extractMercadoPagoPaymentId(input: {
  searchParams: URLSearchParams;
  body: unknown;
}): string | null {
  const queryDataId = input.searchParams.get("data.id")?.trim();
  if (queryDataId) return queryDataId;

  const topic = input.searchParams.get("topic") ?? input.searchParams.get("type");
  const queryId = input.searchParams.get("id")?.trim();
  if (queryId && (topic === "payment" || topic === "payment.created" || topic === "payment.updated")) {
    return queryId;
  }

  if (input.body && typeof input.body === "object") {
    const record = input.body as Record<string, unknown>;
    const type = typeof record.type === "string" ? record.type : typeof record.topic === "string" ? record.topic : "";
    const action = typeof record.action === "string" ? record.action : "";
    const data = record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : null;
    const dataId = data?.id != null ? String(data.id) : "";
    if (dataId && (type === "payment" || action.startsWith("payment.") || !type)) {
      return dataId;
    }
  }

  return null;
}

export function verifyMercadoPagoWebhookSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  const signature = params.xSignature?.trim() ?? "";
  const secret = params.secret.trim();
  if (!signature || !secret) return false;

  let ts = "";
  let hash = "";
  for (const part of signature.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (key === "ts") ts = val;
    if (key === "v1") hash = val;
  }
  if (!ts || !hash) return false;

  const manifestParts: string[] = [];
  if (params.dataId) manifestParts.push(`id:${params.dataId.toLowerCase()}`);
  if (params.xRequestId) manifestParts.push(`request-id:${params.xRequestId}`);
  manifestParts.push(`ts:${ts}`);
  const manifest = `${manifestParts.join(";")};`;
  const computed = createHmac("sha256", secret).update(manifest).digest("hex");
  return safeEqual(computed, hash);
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

type FetchLike = typeof fetch;

export async function createCheckoutPreference(
  params: {
    topUpId: string;
    clientId: string;
    amountMxn: number;
    payerEmail?: string | null;
  },
  fetchImpl: FetchLike = fetch,
): Promise<MercadoPagoPreference> {
  const token = assertMercadoPagoConfigured();
  const amount = asMoney(params.amountMxn);
  const base = appBaseUrl();
  const backUrls = {
    success: `${base}/portal/saldo?estado=aprobado`,
    failure: `${base}/portal/saldo?estado=rechazado`,
    pending: `${base}/portal/saldo?estado=pendiente`,
  };
  const secure = base.startsWith("https://");

  const response = await fetchImpl(`${MP_API_BASE}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": params.topUpId,
    },
    body: JSON.stringify({
      items: [
        {
          id: "codienvio-wallet-topup",
          title: "Recarga de saldo CodiEnvio",
          description: "Saldo prepagado para comprar guías. No incluye el monedero Envía del operador.",
          quantity: 1,
          currency_id: "MXN",
          unit_price: amount,
        },
      ],
      payer: params.payerEmail ? { email: params.payerEmail } : undefined,
      external_reference: params.topUpId,
      metadata: {
        client_id: params.clientId,
        top_up_id: params.topUpId,
        amount_mxn: amount.toFixed(2),
      },
      back_urls: backUrls,
      ...(secure ? { auto_return: "approved", notification_url: `${base}/api/webhooks/mercadopago` } : {}),
      statement_descriptor: "CODIENVIO",
    }),
  });

  if (!response.ok) {
    throw new AppError(
      "No se pudo iniciar el pago con Mercado Pago. Intenta de nuevo o pide ayuda a tu administrador.",
      502,
      "MERCADOPAGO_PREFERENCE_FAILED",
    );
  }

  const payload = (await response.json()) as {
    id?: string;
    init_point?: string;
    sandbox_init_point?: string;
  };
  const checkoutUrl = token.startsWith("TEST-")
    ? payload.sandbox_init_point || payload.init_point
    : payload.init_point || payload.sandbox_init_point;
  if (!payload.id || !checkoutUrl) {
    throw new AppError(
      "Mercado Pago no devolvió una URL de pago. Revisa las credenciales.",
      502,
      "MERCADOPAGO_PREFERENCE_FAILED",
    );
  }
  return { id: payload.id, checkoutUrl };
}

export async function fetchMercadoPagoPayment(
  paymentId: string,
  fetchImpl: FetchLike = fetch,
): Promise<MercadoPagoPayment> {
  const token = assertMercadoPagoConfigured();
  const response = await fetchImpl(`${MP_API_BASE}/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new AppError(
      "No se pudo consultar el pago en Mercado Pago.",
      502,
      "MERCADOPAGO_PAYMENT_LOOKUP_FAILED",
    );
  }
  const payload = (await response.json()) as {
    id?: number | string;
    status?: string;
    transaction_amount?: number;
    currency_id?: string;
    external_reference?: string | null;
    metadata?: Record<string, unknown> | null;
  };
  if (payload.id == null || !payload.status) {
    throw new AppError("Mercado Pago devolvió un pago incompleto.", 502, "MERCADOPAGO_PAYMENT_LOOKUP_FAILED");
  }
  return {
    id: String(payload.id),
    status: payload.status,
    transaction_amount: asMoney(payload.transaction_amount ?? 0),
    currency_id: payload.currency_id ?? "",
    external_reference: payload.external_reference ?? null,
    metadata: payload.metadata ?? null,
  };
}

export function metadataString(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!metadata) return null;
  const direct = metadata[key];
  if (direct != null && String(direct).trim()) return String(direct).trim();
  const snake = metadata[key.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`)];
  if (snake != null && String(snake).trim()) return String(snake).trim();
  return null;
}
