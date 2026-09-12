"use client";

import { useMemo, useState } from "react";
import { startWalletTopUpAction } from "@/app/portal/actions";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMxn } from "@/lib/money";
import { cn } from "@/lib/utils";
import { TOP_UP_MAX_MXN, TOP_UP_MIN_MXN, TOP_UP_PRESETS_MXN } from "@/lib/validations";

export function TopUpForm({ configured }: { configured: boolean }) {
  const [preset, setPreset] = useState<number | "custom">(TOP_UP_PRESETS_MXN[1]);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const amount = useMemo(() => {
    if (preset === "custom") return Number(custom);
    return preset;
  }, [custom, preset]);

  async function onSubmit(event: React.FormEvent) {
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
      const result = await startWalletTopUpAction(amount);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = result.checkoutUrl;
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
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
              onClick={() => setPreset(value)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-semibold tabular-nums",
                preset === value
                  ? "border-navy bg-navy text-white"
                  : "border-navy/15 bg-white text-navy hover:bg-papel",
              )}
            >
              {formatMxn(value)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPreset("custom")}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-semibold",
              preset === "custom"
                ? "border-navy bg-navy text-white"
                : "border-navy/15 bg-white text-navy hover:bg-papel",
            )}
          >
            Otro
          </button>
        </div>
      </div>

      {preset === "custom" ? (
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

      <Button type="submit" size="lg" disabled={pending || !configured}>
        {pending ? "Redirigiendo…" : "Pagar con Mercado Pago"}
      </Button>
      {!configured ? (
        <p className="text-sm text-destructive">
          Mercado Pago no está configurado. Pide a tu administrador que cargue las credenciales en el
          servidor.
        </p>
      ) : null}
    </form>
  );
}
