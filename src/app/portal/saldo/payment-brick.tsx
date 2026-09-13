"use client";

import { useEffect, useId, useState } from "react";

const MP_SDK_SRC = "https://sdk.mercadopago.com/js/v2";

type BrickController = { unmount: () => void };

type MercadoPagoCtor = new (
  publicKey: string,
  options?: { locale?: string },
) => {
  bricks: () => {
    create: (name: string, containerId: string, settings: unknown) => Promise<BrickController>;
  };
};

declare global {
  interface Window {
    MercadoPago?: MercadoPagoCtor;
  }
}

let sdkPromise: Promise<MercadoPagoCtor> | null = null;

function loadMercadoPagoSdk(): Promise<MercadoPagoCtor> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Mercado Pago solo está disponible en el navegador."));
  }
  if (window.MercadoPago) return Promise.resolve(window.MercadoPago);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${MP_SDK_SRC}"]`);
    const finish = () => {
      if (window.MercadoPago) resolve(window.MercadoPago);
      else reject(new Error("No se pudo inicializar Mercado Pago."));
    };
    if (existing) {
      if (window.MercadoPago) {
        finish();
        return;
      }
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar Mercado Pago.")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = MP_SDK_SRC;
    script.async = true;
    script.onload = finish;
    script.onerror = () => reject(new Error("No se pudo cargar Mercado Pago."));
    document.head.appendChild(script);
  });

  return sdkPromise;
}

const brickVisual = {
  style: {
    theme: "default",
    customVariables: {
      baseColor: "#0B1B4B",
      buttonBackgroundColor: "#0B1B4B",
      buttonTextColor: "#FFFFFF",
      formBackgroundColor: "#FFFFFF",
    },
  },
};

export function WalletPaymentBrick({
  publicKey,
  amountMxn,
  payerEmail,
  onSubmitForm,
  onBrickError,
}: {
  publicKey: string;
  amountMxn: number;
  payerEmail: string;
  onSubmitForm: (formData: unknown) => Promise<void>;
  onBrickError: (message: string) => void;
}) {
  const containerId = useId().replace(/:/g, "");
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let controller: BrickController | null = null;

    async function mount() {
      try {
        const MercadoPago = await loadMercadoPagoSdk();
        if (cancelled) return;
        const bricks = new MercadoPago(publicKey, { locale: "es-MX" }).bricks();
        controller = await bricks.create("payment", containerId, {
          initialization: {
            amount: amountMxn,
            payer: payerEmail ? { email: payerEmail } : undefined,
          },
          customization: {
            visual: brickVisual,
            paymentMethods: {
              maxInstallments: 1,
              creditCard: "all",
              debitCard: "all",
              ticket: ["oxxo"],
              bankTransfer: "all",
            },
          },
          callbacks: {
            onReady: () => {
              if (!cancelled) setReady(true);
            },
            onSubmit: ({ formData }: { formData?: unknown; selectedPaymentMethod?: string }) =>
              onSubmitForm(formData),
            onError: (error: { message?: string } | undefined) => {
              onBrickError(error?.message || "No se pudo mostrar el formulario de pago.");
            },
          },
        });
        if (cancelled) controller.unmount();
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "No se pudo cargar el pago.");
        }
      }
    }

    void mount();
    return () => {
      cancelled = true;
      controller?.unmount();
    };
  }, [amountMxn, containerId, onBrickError, onSubmitForm, payerEmail, publicKey]);

  return (
    <div className="space-y-3">
      {!ready && !loadError ? (
        <p className="text-sm text-muted-foreground">Cargando el pago seguro de Mercado Pago…</p>
      ) : null}
      {loadError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}
      <div id={containerId} className="min-h-[12rem]" />
    </div>
  );
}

export function WalletStatusBrick({
  publicKey,
  paymentId,
}: {
  publicKey: string;
  paymentId: string;
}) {
  const containerId = useId().replace(/:/g, "");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let controller: BrickController | null = null;

    async function mount() {
      try {
        const MercadoPago = await loadMercadoPagoSdk();
        if (cancelled) return;
        const bricks = new MercadoPago(publicKey, { locale: "es-MX" }).bricks();
        controller = await bricks.create("statusScreen", containerId, {
          initialization: { paymentId },
          customization: { visual: brickVisual },
          callbacks: {
            onError: (error: { message?: string } | undefined) => {
              if (!cancelled) {
                setLoadError(error?.message || "No se pudieron mostrar las instrucciones de pago.");
              }
            },
          },
        });
        if (cancelled) controller.unmount();
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "No se pudieron mostrar las instrucciones.");
        }
      }
    }

    void mount();
    return () => {
      cancelled = true;
      controller?.unmount();
    };
  }, [containerId, paymentId, publicKey]);

  return (
    <div className="space-y-3">
      {loadError ? (
        <p className="rounded-md border border-navy/10 bg-papel px-3 py-2 text-sm text-navy">
          El pago quedó pendiente. Conserva el comprobante de Mercado Pago; el saldo se acredita al
          confirmarse.
        </p>
      ) : null}
      <div id={containerId} className="min-h-[10rem]" />
    </div>
  );
}
