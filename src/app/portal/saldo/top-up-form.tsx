"use client";

import { useCallback, useMemo, useState } from "react";
import {
  processWalletTopUpPaymentAction,
  startWalletTopUpAction,
} from "@/app/portal/actions";
import { WalletPaymentBrick } from "@/app/portal/saldo/payment-brick";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMxn } from "@/lib/money";
import { cn } from "@/lib/utils";
import { TOP_UP_MAX_MXN, TOP_UP_MIN_MXN, TOP_UP_PRESETS_MXN } from "@/lib/validations";
import { topUpEstadoFromPaymentStatus } from "@/lib/wallet-copy";

export function TopUpForm({
  configured,
  publicKey,
  payerEmail,
}: {
  configured: boolean;
  publicKey: string;
  payerEmail: string;
}) {
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

  async function onContinue(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!configured || !publicKey) {
      setError(
        "Mercado Pago no está configurado. Pide a tu administrador que agregue MERCADOPAGO_ACCESS_TOKEN y MERCADOPAGO_PUBLIC_KEY.",
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
      <form onSubmit={onContinue} className="space-y-5">
        <div>
          <p className="text-sm font-medium text-navy">Monto a recargar</p>
          <p className="type-caption mt-1 text-muted-foreground">
            Elige un monto o escribe uno personalizado (mín. {formatMxn(TOP_UP_MIN_MXN)}, máx.{" "}
            {formatMxn(TOP_UP_MAX_MXN)}). Pagas aquí mismo, sin ir a Mercado Pago.
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
              type="number"
              inputMode="decimal"
              min={TOP_UP_MIN_MXN}
              max={TOP_UP_MAX_MXN}
              step="0.01"
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              placeholder="750.00"
              required
            />
          </Field>
        ) : null}

        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {!topUpId ? (
          <Button type="submit" size="lg" disabled={pending || !configured}>
            {pending ? "Preparando pago…" : "Continuar al pago"}
          </Button>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-navy">
              Pagar {formatMxn(lockedAmount ?? amount)} en CodiEnvio
            </p>
            <Button type="button" variant="outline" size="sm" onClick={resetBrick}>
              Cambiar monto
            </Button>
          </div>
        )}
      </form>

      {topUpId && lockedAmount && publicKey ? (
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
          Mercado Pago no está configurado. Pide a tu administrador que cargue el access token y la
          public key en el servidor.
        </p>
      ) : null}
    </div>
  );
}
