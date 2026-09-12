import { NextResponse } from "next/server";
import { errorToResponse } from "@/lib/errors";
import {
  extractMercadoPagoPaymentId,
  getMercadoPagoStatus,
  verifyMercadoPagoWebhookSignature,
} from "@/lib/mercadopago";
import { applyMercadoPagoPayment } from "@/lib/wallet-topup";

export const runtime = "nodejs";

async function parseBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const body = await parseBody(request);
    const paymentId = extractMercadoPagoPaymentId({
      searchParams: url.searchParams,
      body,
    });

    const status = getMercadoPagoStatus();
    if (!status.configured) {
      return NextResponse.json(
        { error: { code: "MERCADOPAGO_NOT_CONFIGURED", message: "Mercado Pago no está configurado." } },
        { status: 503 },
      );
    }

    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() ?? "";
    if (secret) {
      const valid = verifyMercadoPagoWebhookSignature({
        xSignature: request.headers.get("x-signature"),
        xRequestId: request.headers.get("x-request-id"),
        dataId: paymentId ?? url.searchParams.get("data.id"),
        secret,
      });
      if (!valid) {
        return NextResponse.json(
          { error: { code: "INVALID_SIGNATURE", message: "Firma de webhook inválida." } },
          { status: 401 },
        );
      }
    }

    if (!paymentId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const result = await applyMercadoPagoPayment(paymentId);
    return NextResponse.json({
      ok: true,
      credited: result.credited,
      alreadyCredited: result.alreadyCredited,
      paymentStatus: result.paymentStatus,
    });
  } catch (error) {
    const { status, body } = errorToResponse(error);
    return NextResponse.json(body, { status });
  }
}
