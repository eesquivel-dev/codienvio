"use client";

import { useCallback, useMemo, useState } from "react";
import {
  processWalletTopUpPaymentAction,
  startWalletCheckoutProAction,
  startWalletTopUpAction,
} from "@/app/portal/actions";
import { WalletPaymentBrick } from "@/app/portal/saldo/payment-brick";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMxn } from "@/lib/money";
import { cn } from "@/lib/utils";
import { TOP_UP_MAX_MXN, TOP_UP_MIN_MXN, TOP_UP_PRESETS_MXN } from "@/lib/validations";
import {
  type WalletCheckoutPath,
  topUpEstadoFromPaymentStatus,
  walletCheckoutPathLabel,
} from "@/lib/wallet-copy";

export function TopUpForm({
  configured,
  brickReady,
  publicKey,
  payerEmail,
}: {
  configured: boolean;
  brickReady: boolean;
  publicKey: string;
  payerEmail: string;
}) {
  const [path, setPath] = useState<WalletCheckoutPath>(brickReady ? "brick" : "checkout_pro");
  const [preset, setPreset] = useState<number | "custom">(TOP_UP_PRESETS_MXN[1]);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [topUpId, setTopUpId] = useState<string | null>(null);
  const [lockedAmount, setLockedAmount] = useState<number | null>(null);

  const amount = useMemo(() => {
    if (preset === "custom") return Number(custom);
    return preset;
  }, [custom, preset]);

  const resetBrick = useCallback(() => {
    setTopUpId(null);
    setLockedAmount(null);
    setError(null);
    setPending(false);
  }, []);

  function selectPath(next: WalletCheckoutPath) {
    if (next === path) return;
    resetBrick();
    setPath(next);
  }

  async function onContinueBrick(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!brickReady || !publicKey) {
      setError(
        "El pago en el portal necesita MERCADOPAGO_PUBLIC_KEY. Puedes usar «Pagar con Mercado Pago» o pedir al administrador que agregue la public key.",
      );
      return;
    }
    setPending(true);
    try {
      const result = await startWalletTopUpAction(amount);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTopUpId(result.topUpId);
      setLockedAmount(result.amountMxn);
    } finally {
      setPending(false);
    }
  }

  async function onCheckoutPro(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!configured) {
      setError(
        "Mercado Pago no está configurado. Pide a tu administrador que agregue MERCADOPAGO_ACCESS_TOKEN.",
      );
      return;
    }
    setPending(true);
    try {
      const result = await startWalletCheckoutProAction(amount);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = result.checkoutUrl;
    } finally {
      setPending(false);
    }
  }

  const submitBrick = useCallback(
    async (formData: unknown) => {
      if (!topUpId) {
        throw new Error("Falta la recarga.");
      }
      const result = await processWalletTopUpPaymentAction({ topUpId, formData });
      if (!result.ok) {
        throw new Error(result.error);
      }
      const estado = topUpEstadoFromPaymentStatus(result.paymentStatus);
      window.location.assign(
        `/portal/saldo?estado=${estado}&payment_id=${encodeURIComponent(result.paymentId)}`,
      );
    },
    [topUpId],
  );

  const onBrickError = useCallback((message: string) => {
    setError(message);
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-navy">Cómo quieres pagar</p>
        <div
          role="tablist"
          aria-label="Método de recarga"
          className="mt-3 flex flex-wrap gap-2"
        >
          <button
            type="button"
            role="tab"
            aria-selected={path === "brick"}
            disabled={Boolean(topUpId)}
            onClick={() => selectPath("brick")}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-semibold",
              path === "brick"
                ? "border-navy bg-navy text-white"
                : "border-navy/15 bg-white text-navy hover:bg-papel",
              topUpId ? "opacity-60" : "",
            )}
          >
            {walletCheckoutPathLabel("brick")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={path === "checkout_pro"}
            disabled={Boolean(topUpId)}
            onClick={() => selectPath("checkout_pro")}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-semibold",
              path === "checkout_pro"
                ? "border-navy bg-navy text-white"
                : "border-navy/15 bg-white text-navy hover:bg-papel",
              topUpId ? "opacity-60" : "",
            )}
          >
            {walletCheckoutPathLabel("checkout_pro")}
          </button>
        </div>
        <p className="type-caption mt-2 text-muted-foreground">
          {path === "brick"
            ? "Tarjeta, OXXO o SPEI en esta página, sin cuenta de Mercado Pago."
            : "Te redirigimos a Mercado Pago para pagar con tu cuenta, saldo o tarjetas guardadas."}
        </p>
      </div>

      <form
        onSubmit={path === "brick" ? onContinueBrick : onCheckoutPro}
        autoComplete="off"
        className="space-y-5"
      >
        <div>
          <p className="text-sm font-medium text-navy">Monto a recargar</p>
          <p className="type-caption mt-1 text-muted-foreground">
            Elige un monto o escribe uno personalizado (mín. {formatMxn(TOP_UP_MIN_MXN)}, máx.{" "}
            {formatMxn(TOP_UP_MAX_MXN)}).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TOP_UP_PRESETS_MXN.map((value) => (
              <button
                key={value}
                type="button"
                disabled={Boolean(topUpId)}
                onClick={() => setPreset(value)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-semibold tabular-nums",
                  preset === value
                    ? "border-navy bg-navy text-white"
                    : "border-navy/15 bg-white text-navy hover:bg-papel",
                  topUpId ? "opacity-60" : "",
                )}
              >
                {formatMxn(value)}
              </button>
            ))}
            <button
              type="button"
              disabled={Boolean(topUpId)}
              onClick={() => setPreset("custom")}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-semibold",
                preset === "custom"
                  ? "border-navy bg-navy text-white"
                  : "border-navy/15 bg-white text-navy hover:bg-papel",
                topUpId ? "opacity-60" : "",
              )}
            >
              Otro
            </button>
          </div>
        </div>

        {preset === "custom" && !topUpId ? (
          <Field label="Monto personalizado (MXN)" htmlFor="custom-amount">
            <Input
              id="custom-amount"
              name="codienvio-topup-amount"
              type="number"
              inputMode="decimal"
              min={TOP_UP_MIN_MXN}
              max={TOP_UP_MAX_MXN}
              step="0.01"
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              placeholder="750.00"
              required
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              data-1p-ignore="true"
              data-lpignore="true"
              data-form-type="other"
            />
          </Field>
        ) : null}

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {path === "brick" && !topUpId ? (
          <Button type="submit" size="lg" disabled={pending || !brickReady}>
            {pending ? "Preparando pago…" : "Continuar al pago"}
          </Button>
        ) : null}

        {path === "brick" && topUpId ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-navy">
              Pagar {formatMxn(lockedAmount ?? amount)} en Código Envío
            </p>
            <Button type="button" variant="outline" size="sm" onClick={resetBrick}>
              Cambiar monto
            </Button>
          </div>
        ) : null}

        {path === "checkout_pro" ? (
          <Button type="submit" size="lg" disabled={pending || !configured}>
            {pending ? "Redirigiendo…" : "Pagar con Mercado Pago"}
          </Button>
        ) : null}
      </form>

      {path === "brick" && topUpId && lockedAmount && publicKey ? (
        <WalletPaymentBrick
          key={topUpId}
          publicKey={publicKey}
          amountMxn={lockedAmount}
          payerEmail={payerEmail}
          onSubmitForm={submitBrick}
          onBrickError={onBrickError}
        />
      ) : null}

      {!configured ? (
        <p className="text-sm text-destructive">
          Mercado Pago no está configurado. Pide a tu administrador que cargue el access token (y la
          public key para pagar aquí) en el servidor.
        </p>
      ) : !brickReady && path === "brick" ? (
        <p className="text-sm text-destructive">
          Falta MERCADOPAGO_PUBLIC_KEY para el pago en el portal. Usa «Pagar con Mercado Pago» mientras
          tanto.
        </p>
      ) : null}
    </div>
  );
}
