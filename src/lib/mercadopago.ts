import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/errors";
import { clientCopy } from "@/lib/brand-copy";
import { asMoney } from "@/lib/money";

const MP_API_BASE = "https://api.mercadopago.com";

export type MercadoPagoStatus = {
  configured: boolean;
  brickReady: boolean;
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

export type MercadoPagoBrickFormData = {
  token?: string;
  payment_method_id: string;
  installments?: number;
  issuer_id?: string | number;
  payer?: {
    email?: string;
    identification?: { type?: string; number?: string };
    first_name?: string;
    last_name?: string;
  };
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
    brickReady: Boolean(accessToken && publicKey),
  };
}

/** Public key for Payment Brick. Safe to send to the browser; never expose the access token. */
export function getMercadoPagoPublicKey(): string {
  return process.env.MERCADOPAGO_PUBLIC_KEY?.trim() ?? "";
}

export function assertMercadoPagoPublicKey(): string {
  const publicKey = getMercadoPagoPublicKey();
  if (!publicKey) {
    throw new AppError(
      "Mercado Pago no está configurado. Pide a tu administrador que agregue MERCADOPAGO_PUBLIC_KEY.",
      503,
      "MERCADOPAGO_PUBLIC_KEY_MISSING",
    );
  }
  return publicKey;
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function optionalTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

/**
 * Checkout Pro preference (redirect). Same WalletTopUp + webhook as Payment Brick.
 */
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
          title: clientCopy.mpItemTitle,
          description: clientCopy.mpItemDescription,
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

/**
 * Accepts Payment Brick `formData` (or `{ formData }`) from the browser.
 * Amount is never taken from the client — the server overwrites it.
 * Never persist PAN/CVV: only token, method, installments and payer identity.
 */
export function parseBrickFormData(input: unknown): MercadoPagoBrickFormData {
  const root = asRecord(input);
  if (!root) {
    throw new AppError("Los datos de pago no son válidos.", 400, "INVALID_PAYMENT_FORM");
  }
  const form = asRecord(root.formData) ?? root;
  const paymentMethodId = optionalTrimmedString(form.payment_method_id);
  if (!paymentMethodId) {
    throw new AppError("Falta el método de pago.", 400, "PAYMENT_METHOD_REQUIRED");
  }

  const payerRaw = asRecord(form.payer);
  const identificationRaw = asRecord(payerRaw?.identification);
  const identificationType = optionalTrimmedString(identificationRaw?.type);
  const identificationNumber = optionalTrimmedString(identificationRaw?.number);

  let installments: number | undefined;
  if (form.installments != null && form.installments !== "") {
    const parsed = Number(form.installments);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 24) {
      throw new AppError("El número de mensualidades no es válido.", 400, "INVALID_INSTALLMENTS");
    }
    installments = Math.trunc(parsed);
  }

  const issuerRaw = form.issuer_id;
  const issuerId =
    typeof issuerRaw === "number" && Number.isFinite(issuerRaw)
      ? issuerRaw
      : optionalTrimmedString(issuerRaw);

  const payerEmail = optionalTrimmedString(payerRaw?.email);
  const payerFirst = optionalTrimmedString(payerRaw?.first_name);
  const payerLast = optionalTrimmedString(payerRaw?.last_name);
  const payer =
    payerRaw && (payerEmail || payerFirst || payerLast || (identificationType && identificationNumber))
      ? {
          ...(payerEmail ? { email: payerEmail } : {}),
          ...(payerFirst ? { first_name: payerFirst } : {}),
          ...(payerLast ? { last_name: payerLast } : {}),
          ...(identificationType && identificationNumber
            ? { identification: { type: identificationType, number: identificationNumber } }
            : {}),
        }
      : undefined;

  return {
    payment_method_id: paymentMethodId,
    ...(optionalTrimmedString(form.token) ? { token: optionalTrimmedString(form.token) } : {}),
    ...(installments != null ? { installments } : {}),
    ...(issuerId != null ? { issuer_id: issuerId } : {}),
    ...(payer ? { payer } : {}),
  };
}

function paymentFromPayload(payload: {
  id?: number | string;
  status?: string;
  transaction_amount?: number;
  currency_id?: string;
  external_reference?: string | null;
  metadata?: Record<string, unknown> | null;
}): MercadoPagoPayment {
  if (payload.id == null || !payload.status) {
    throw new AppError("Mercado Pago devolvió un pago incompleto.", 502, "MERCADOPAGO_PAYMENT_INCOMPLETE");
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

export async function createMercadoPagoPayment(
  params: {
    topUpId: string;
    clientId: string;
    amountMxn: number;
    formData: MercadoPagoBrickFormData;
    payerEmail?: string | null;
  },
  fetchImpl: FetchLike = fetch,
): Promise<MercadoPagoPayment> {
  const token = assertMercadoPagoConfigured();
  const amount = asMoney(params.amountMxn);
  const form = params.formData;
  const payerEmail = form.payer?.email || params.payerEmail?.trim() || "";
  if (!payerEmail) {
    throw new AppError("Falta el correo del pagador.", 400, "PAYER_EMAIL_REQUIRED");
  }

  const body: Record<string, unknown> = {
    transaction_amount: amount,
    description: clientCopy.mpItemTitle,
    payment_method_id: form.payment_method_id,
    payer: {
      email: payerEmail,
      ...(form.payer?.first_name ? { first_name: form.payer.first_name } : {}),
      ...(form.payer?.last_name ? { last_name: form.payer.last_name } : {}),
      ...(form.payer?.identification ? { identification: form.payer.identification } : {}),
    },
    external_reference: params.topUpId,
    metadata: {
      client_id: params.clientId,
      top_up_id: params.topUpId,
      amount_mxn: amount.toFixed(2),
    },
    statement_descriptor: "CODIENVIO",
  };

  if (form.token) {
    body.token = form.token;
    body.installments = form.installments ?? 1;
    if (form.issuer_id != null) body.issuer_id = form.issuer_id;
  }

  const base = appBaseUrl();
  if (base.startsWith("https://")) {
    body.notification_url = `${base}/api/webhooks/mercadopago`;
  }

  const response = await fetchImpl(`${MP_API_BASE}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": params.topUpId,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new AppError(
      "No se pudo procesar el pago con Mercado Pago. Verifica los datos o intenta otro método.",
      502,
      "MERCADOPAGO_PAYMENT_FAILED",
    );
  }

  return paymentFromPayload((await response.json()) as Parameters<typeof paymentFromPayload>[0]);
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
  return paymentFromPayload((await response.json()) as Parameters<typeof paymentFromPayload>[0]);
}

export function metadataString(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!metadata) return null;
  const direct = metadata[key];
  if (direct != null && String(direct).trim()) return String(direct).trim();
  const snake = metadata[key.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`)];
  if (snake != null && String(snake).trim()) return String(snake).trim();
  return null;
}
