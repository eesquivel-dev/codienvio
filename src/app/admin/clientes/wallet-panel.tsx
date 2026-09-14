"use client";

import { useState } from "react";
import { adjustClientBalanceAction } from "@/app/admin/actions";
import { Field } from "@/components/field";
import { WalletLedgerList } from "@/components/wallet-ledger-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WalletLedgerRow } from "@/lib/wallet-copy";

export type WalletPanelClient = {
  id: string;
  balanceMxn: number;
  balanceLabel: string;
  ledger: WalletLedgerRow[];
};

export function WalletPanel({
  client,
  onError,
}: {
  client: WalletPanelClient;
  onError: (message: string | null) => void;
}) {
  const [busy, setBusy] = useState<"credit" | "debit" | null>(null);

  async function onAdjust(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const direction = submitter?.value === "debit" ? "debit" : "credit";
    const formData = new FormData(form);
    formData.set("clientId", client.id);
    formData.set("direction", direction);
    setBusy(direction);
    onError(null);
    try {
      const result = await adjustClientBalanceAction(formData);
      if (!result.ok) onError(result.error);
      else form.reset();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-navy/10 bg-papel p-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="type-overline text-muted-foreground">Saldo prepagado</p>
          <p className="text-xl font-bold tabular-nums tracking-[-0.03em] text-navy">
            {client.balanceLabel}
          </p>
        </div>
        <Badge variant={client.balanceMxn > 0 ? "success" : "outline"}>MXN</Badge>
      </div>
      <form onSubmit={onAdjust} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Monto MXN" htmlFor={`amount-${client.id}`}>
          <Input
            id={`amount-${client.id}`}
            name="amountMxn"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            placeholder="500.00"
            required
          />
        </Field>
        <Field label="Motivo" htmlFor={`note-${client.id}`} hint="Obligatorio en carga y ajuste">
          <Input
            id={`note-${client.id}`}
            name="note"
            maxLength={200}
            placeholder="Transferencia, cortesía…"
            required
            minLength={2}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" name="direction" value="credit" size="sm" disabled={busy !== null}>
            {busy === "credit" ? "Cargando…" : "Cargar saldo"}
          </Button>
          <Button
            type="submit"
            name="direction"
            value="debit"
            size="sm"
            variant="outline"
            disabled={busy !== null}
          >
            {busy === "debit" ? "Ajustando…" : "Ajuste (−)"}
          </Button>
        </div>
      </form>
      <div>
        <p className="type-overline mb-2 text-muted-foreground">Movimientos</p>
        <WalletLedgerList rows={client.ledger} />
      </div>
    </div>
  );
}
