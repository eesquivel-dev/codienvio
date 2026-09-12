"use client";

import { useMemo, useState } from "react";
import {
  createApiKeyAction,
  createClientAction,
  revokeApiKeyAction,
  toggleClientAction,
} from "@/app/admin/actions";
import { Field } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ClientRow = {
  id: string;
  companyName: string;
  email: string;
  name: string;
  active: boolean;
  feePercent: number | null;
  feeFixedMxn: number | null;
  balanceLabel: string;
  keys: Array<{ id: string; name: string; prefix: string; revoked: boolean }>;
};

export function ClientsManager({ clients }: { clients: ClientRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [plainKey, setPlainKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((client) =>
      [client.companyName, client.email, client.name].join(" ").toLowerCase().includes(q),
    );
  }, [clients, query]);

  async function onCreate(formData: FormData) {
    setError(null);
    setPlainKey(null);
    const result = await createClientAction(formData);
    if (!result.ok) setError(result.error);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo cliente</CardTitle>
          <CardDescription>
            Deja las comisiones vacías para usar la regla global. El saldo es un stub (sin cobros).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={onCreate} className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="name">
              <Input id="name" name="name" required />
            </Field>
            <Field label="Empresa" htmlFor="companyName">
              <Input id="companyName" name="companyName" required />
            </Field>
            <Field label="Correo" htmlFor="email">
              <Input id="email" name="email" type="email" required />
            </Field>
            <Field label="Contraseña" htmlFor="password" hint="Mínimo 8 caracteres">
              <Input id="password" name="password" type="password" minLength={8} required />
            </Field>
            <Field label="Comisión % (opcional)" htmlFor="feePercent">
              <Input id="feePercent" name="feePercent" type="number" step="0.01" min="0" />
            </Field>
            <Field label="Comisión fija MXN (opcional)" htmlFor="feeFixedMxn">
              <Input id="feeFixedMxn" name="feeFixedMxn" type="number" step="0.01" min="0" />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit">Crear cliente</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {plainKey ? (
        <div className="rounded-md border border-lima/40 bg-lima/15 px-3 py-3 text-sm text-navy">
          <p className="font-medium">API key (cópiala ahora, no se vuelve a mostrar)</p>
          <code className="mt-1 block break-all font-mono">{plainKey}</code>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(plainKey);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "Copiada" : "Copiar"}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} de {clients.length} clientes
        </p>
        <Input
          className="sm:max-w-xs"
          placeholder="Buscar por empresa, nombre o correo"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay clientes que coincidan.</p>
        ) : null}
        {filtered.map((client) => (
          <Card key={client.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{client.companyName}</CardTitle>
                  <CardDescription>
                    {client.name} · {client.email}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={client.active ? "success" : "destructive"}>
                    {client.active ? "Activo" : "Inactivo"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleClientAction(client.id, !client.active)}
                  >
                    {client.active ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                Comisión:{" "}
                {client.feePercent === null && client.feeFixedMxn === null
                  ? "regla global"
                  : `${client.feePercent ?? "global"}% + ${client.feeFixedMxn ?? "global"} MXN`}
                {" · "}
                Saldo stub: {client.balanceLabel}
              </p>
              <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                <p className="type-overline text-muted-foreground">API keys</p>
                {client.keys.length === 0 ? (
                  <p className="text-muted-foreground">Sin API keys</p>
                ) : (
                  client.keys.map((key) => (
                    <div key={key.id} className="flex items-center justify-between gap-2">
                      <span>
                        {key.name} · <code>{key.prefix}…</code>{" "}
                        {key.revoked ? <Badge variant="destructive">revocada</Badge> : null}
                      </span>
                      {!key.revoked ? (
                        <Button size="sm" variant="ghost" onClick={() => revokeApiKeyAction(key.id)}>
                          Revocar
                        </Button>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const result = await createApiKeyAction(client.id, "Portal");
                  if (!result.ok) setError(result.error);
                  else setPlainKey(result.apiKey);
                }}
              >
                Generar API key
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
