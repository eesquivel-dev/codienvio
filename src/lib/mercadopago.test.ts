import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertMercadoPagoConfigured,
  extractMercadoPagoPaymentId,
  getMercadoPagoStatus,
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
  it("marca configurado solo si hay access token", () => {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    delete process.env.MERCADOPAGO_PUBLIC_KEY;
    expect(getMercadoPagoStatus()).toMatchObject({
      configured: false,
      hasAccessToken: false,
      hasPublicKey: false,
    });

    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-abc";
    process.env.MERCADOPAGO_PUBLIC_KEY = "APP_USR-pub";
    expect(getMercadoPagoStatus()).toMatchObject({
      configured: true,
      hasAccessToken: true,
      hasPublicKey: true,
    });
  });

  it("lanza error en español si falta el token", () => {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    expect(() => assertMercadoPagoConfigured()).toThrow(/Mercado Pago no está configurado/);
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
