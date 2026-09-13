import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertMercadoPagoConfigured,
  assertMercadoPagoPublicKey,
  createMercadoPagoPayment,
  extractMercadoPagoPaymentId,
  getMercadoPagoPublicKey,
  getMercadoPagoStatus,
  parseBrickFormData,
  verifyMercadoPagoWebhookSignature,
} from "@/lib/mercadopago";

const ORIGINAL_ENV = {
  token: process.env.MERCADOPAGO_ACCESS_TOKEN,
  publicKey: process.env.MERCADOPAGO_PUBLIC_KEY,
  secret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
};

afterEach(() => {
  process.env.MERCADOPAGO_ACCESS_TOKEN = ORIGINAL_ENV.token;
  process.env.MERCADOPAGO_PUBLIC_KEY = ORIGINAL_ENV.publicKey;
  process.env.MERCADOPAGO_WEBHOOK_SECRET = ORIGINAL_ENV.secret;
});

describe("getMercadoPagoStatus", () => {
  it("marca configurado solo si hay access token y Brick si también hay public key", () => {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    delete process.env.MERCADOPAGO_PUBLIC_KEY;
    expect(getMercadoPagoStatus()).toMatchObject({
      configured: false,
      brickReady: false,
      hasAccessToken: false,
      hasPublicKey: false,
    });

    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-abc";
    expect(getMercadoPagoStatus()).toMatchObject({
      configured: true,
      brickReady: false,
      hasAccessToken: true,
      hasPublicKey: false,
    });

    process.env.MERCADOPAGO_PUBLIC_KEY = "APP_USR-pub";
    expect(getMercadoPagoStatus()).toMatchObject({
      configured: true,
      brickReady: true,
      hasAccessToken: true,
      hasPublicKey: true,
    });
    expect(getMercadoPagoPublicKey()).toBe("APP_USR-pub");
  });

  it("lanza error en español si falta el token o la public key", () => {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    expect(() => assertMercadoPagoConfigured()).toThrow(/Mercado Pago no está configurado/);
    delete process.env.MERCADOPAGO_PUBLIC_KEY;
    expect(() => assertMercadoPagoPublicKey()).toThrow(/MERCADOPAGO_PUBLIC_KEY/);
  });
});

describe("parseBrickFormData", () => {
  it("acepta formData del Brick y el envoltorio onSubmit", () => {
    expect(
      parseBrickFormData({
        token: "tok_card",
        payment_method_id: "visa",
        installments: "1",
        issuer_id: "310",
        payer: { email: "ana@demo.mx", identification: { type: "CURP", number: "X1" } },
        transaction_amount: 9999,
      }),
    ).toEqual({
      token: "tok_card",
      payment_method_id: "visa",
      installments: 1,
      issuer_id: "310",
      payer: { email: "ana@demo.mx", identification: { type: "CURP", number: "X1" } },
    });

    expect(parseBrickFormData({ formData: { payment_method_id: "oxxo", payer: { email: "a@b.mx" } } })).toEqual({
      payment_method_id: "oxxo",
      payer: { email: "a@b.mx" },
    });
  });

  it("rechaza un payload sin método de pago", () => {
    expect(() => parseBrickFormData({ token: "tok" })).toThrow(/método de pago/);
  });
});

describe("createMercadoPagoPayment", () => {
  const previous = {
    token: process.env.MERCADOPAGO_ACCESS_TOKEN,
    url: process.env.NEXTAUTH_URL,
  };

  afterEach(() => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = previous.token;
    process.env.NEXTAUTH_URL = previous.url;
  });

  it("crea el pago con el monto del servidor, no el del Brick", async () => {
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-token";
    process.env.NEXTAUTH_URL = "https://codienvio.example";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 77,
        status: "approved",
        transaction_amount: 500,
        currency_id: "MXN",
        external_reference: "top1",
        metadata: { client_id: "c1" },
      }),
    });

    const payment = await createMercadoPagoPayment(
      {
        topUpId: "top1",
        clientId: "c1",
        amountMxn: 500,
        formData: {
          token: "tok_card",
          payment_method_id: "visa",
          installments: 1,
          payer: { email: "cliente@demo.mx" },
        },
        payerEmail: "cliente@demo.mx",
      },
      fetchImpl as unknown as typeof fetch,
    );

    expect(payment).toMatchObject({ id: "77", status: "approved", transaction_amount: 500 });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.mercadopago.com/v1/payments",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer TEST-token",
          "X-Idempotency-Key": "top1",
        }),
      }),
    );
    const body = JSON.parse(String(fetchImpl.mock.calls[0][1].body)) as {
      transaction_amount: number;
      token: string;
      notification_url: string;
      metadata: { top_up_id: string };
    };
    expect(body.transaction_amount).toBe(500);
    expect(body.token).toBe("tok_card");
    expect(body.notification_url).toBe("https://codienvio.example/api/webhooks/mercadopago");
    expect(body.metadata.top_up_id).toBe("top1");
  });
});

describe("extractMercadoPagoPaymentId", () => {
  it("lee data.id del query y del body payment", () => {
    expect(
      extractMercadoPagoPaymentId({
        searchParams: new URLSearchParams("data.id=999"),
        body: null,
      }),
    ).toBe("999");

    expect(
      extractMercadoPagoPaymentId({
        searchParams: new URLSearchParams("topic=payment&id=888"),
        body: null,
      }),
    ).toBe("888");

    expect(
      extractMercadoPagoPaymentId({
        searchParams: new URLSearchParams(),
        body: { id: 12345, type: "payment", data: { id: "777" } },
      }),
    ).toBe("777");
  });

  it("ignora notificaciones que no son payment", () => {
    expect(
      extractMercadoPagoPaymentId({
        searchParams: new URLSearchParams("topic=merchant_order&id=1"),
        body: { type: "topic_merchant_order_wh", data: { id: "1" } },
      }),
    ).toBeNull();
  });
});

describe("verifyMercadoPagoWebhookSignature", () => {
  it("acepta HMAC válido y rechaza uno alterado", () => {
    const secret = "whsec-test";
    const dataId = "12345";
    const requestId = "req-1";
    const ts = "1704908010";
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const v1 = createHmac("sha256", secret).update(manifest).digest("hex");

    expect(
      verifyMercadoPagoWebhookSignature({
        xSignature: `ts=${ts},v1=${v1}`,
        xRequestId: requestId,
        dataId,
        secret,
      }),
    ).toBe(true);

    expect(
      verifyMercadoPagoWebhookSignature({
        xSignature: `ts=${ts},v1=${v1}`,
        xRequestId: requestId,
        dataId: "99999",
        secret,
      }),
    ).toBe(false);
  });
});
