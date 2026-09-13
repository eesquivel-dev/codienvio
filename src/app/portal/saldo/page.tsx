import Link from "next/link";
import { WalletStatusBrick } from "@/app/portal/saldo/payment-brick";
import { TopUpForm } from "@/app/portal/saldo/top-up-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireClient } from "@/lib/auth";
import { formatDateTimeMx } from "@/lib/format";
import { getMercadoPagoPublicKey, getMercadoPagoStatus } from "@/lib/mercadopago";
import { formatMxn } from "@/lib/money";
import { getClientWallet, walletTxnTypeLabel } from "@/lib/wallet";
import { applyMercadoPagoPayment } from "@/lib/wallet-topup";

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function PortalSaldoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireClient();
  const params = await searchParams;
  const mp = getMercadoPagoStatus();
  const publicKey = mp.brickReady ? getMercadoPagoPublicKey() : "";
  const estado = firstParam(params.estado);
  const paymentId = firstParam(params.payment_id) || firstParam(params.collection_id);

  let syncMessage: { tone: "ok" | "warn" | "err"; text: string } | null = null;
  let paymentStatus: string | null = null;
  if (paymentId && mp.configured) {
    try {
      const result = await applyMercadoPagoPayment(paymentId);
      paymentStatus = result.paymentStatus;
      if (result.credited) {
        syncMessage = {
          tone: "ok",
          text: `Se acreditaron ${formatMxn(result.amountMxn)}. Tu saldo es ${formatMxn(result.balanceMxn)}.`,
        };
      } else if (result.alreadyCredited) {
        syncMessage = {
          tone: "ok",
          text: `Tu recarga está acreditada. Tu saldo es ${formatMxn(result.balanceMxn)}.`,
        };
      } else if (result.paymentStatus === "approved") {
        syncMessage = { tone: "warn", text: "El pago está aprobado; el saldo se confirmará en un momento." };
      } else if (["rejected", "cancelled"].includes(result.paymentStatus)) {
        syncMessage = { tone: "err", text: "El pago no se completó. Puedes intentar otra recarga." };
      } else {
        syncMessage = {
          tone: "warn",
          text: "Tu pago está pendiente. Si usaste OXXO o SPEI, completa las instrucciones. El saldo se acredita cuando Mercado Pago lo confirme.",
        };
      }
    } catch {
      syncMessage = {
        tone: "warn",
        text: "Estamos confirmando el pago. Si ya se aprobó, el saldo se acredita al confirmar el webhook.",
      };
    }
  } else if (estado === "aprobado") {
    syncMessage = {
      tone: "warn",
      text: "Pago recibido. El saldo se acredita al confirmar Mercado Pago (puede tardar unos segundos).",
    };
  } else if (estado === "rechazado") {
    syncMessage = { tone: "err", text: "El pago no se completó. Puedes intentar de nuevo." };
  } else if (estado === "pendiente") {
    syncMessage = {
      tone: "warn",
      text: "Tu pago está pendiente. El saldo se acreditará cuando Mercado Pago lo confirme.",
    };
  }

  const showPendingBrick = Boolean(
    publicKey &&
      paymentId &&
      paymentStatus &&
      !["approved", "rejected", "cancelled", "refunded"].includes(paymentStatus),
  );

  const wallet = await getClientWallet(session.user.clientId!, 20);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saldo"
        description="Recarga tu saldo Código Envío con Mercado Pago: paga aquí (tarjeta, OXXO o SPEI) o con tu cuenta de Mercado Pago. Úsalo para comprar guías cuando las necesites."
        actions={
          <Button asChild variant="outline">
            <Link href="/portal#cotizar">Cotizar envío</Link>
          </Button>
        }
      />

      {syncMessage ? (
        <p
          className={
            syncMessage.tone === "ok"
              ? "rounded-md border border-lima/40 bg-lima/15 px-3 py-2 text-sm text-navy"
              : syncMessage.tone === "err"
                ? "rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                : "rounded-md border border-navy/10 bg-papel px-3 py-2 text-sm text-navy"
          }
        >
          {syncMessage.text}
        </p>
      ) : null}

      {showPendingBrick && paymentId ? (
        <Card>
          <CardHeader>
            <CardTitle>Instrucciones de pago</CardTitle>
            <CardDescription>
              Completa OXXO o SPEI con estos datos. El webhook acreditará el saldo una sola vez.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WalletStatusBrick publicKey={publicKey} paymentId={paymentId} />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recargar saldo</CardTitle>
            <CardDescription>
              Elige un monto en MXN. «Pagar aquí» usa tarjeta, OXXO o SPEI en esta página. «Pagar
              con Mercado Pago» te lleva al checkout de tu cuenta. El saldo se acredita una sola vez
              cuando el pago queda aprobado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TopUpForm
              configured={mp.configured}
              brickReady={mp.brickReady}
              publicKey={publicKey}
              payerEmail={session.user.email ?? ""}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saldo actual</CardTitle>
            <CardDescription>Disponible para comprar guías en el portal.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-[-0.03em] tabular-nums text-navy">
              {formatMxn(wallet.balanceMxn)}
            </p>
            <p className="type-caption mt-3 text-muted-foreground">
              Las recargas aparecen como <strong>Carga</strong> en tu historial. El admin también
              puede cargar saldo a mano.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {wallet.ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay movimientos.</p>
          ) : (
            <ul className="space-y-2">
              {wallet.ledger.map((row) => (
                <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span>
                    {walletTxnTypeLabel(row.type)}
                    {row.note ? ` · ${row.note}` : ""}
                    <span className="block text-xs text-muted-foreground">
                      {formatDateTimeMx(row.createdAt)}
                    </span>
                  </span>
                  <span
                    className={
                      row.amountMxn >= 0
                        ? "font-semibold tabular-nums text-navy"
                        : "font-semibold tabular-nums text-destructive"
                    }
                  >
                    {row.amountMxn >= 0 ? "+" : ""}
                    {formatMxn(row.amountMxn)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
