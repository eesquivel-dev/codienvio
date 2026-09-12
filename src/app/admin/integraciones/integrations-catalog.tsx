"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createApiKeyAction, revokeApiKeyAction } from "@/app/admin/actions";
import { Field } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTimeMx } from "@/lib/format";

type EnviaStatus = {
  environment: string;
  mockMode: boolean;
  hasStoredToken: boolean;
  hasEnvToken: boolean;
  usingMock: boolean;
};

type ClientKeys = {
  id: string;
  companyName: string;
  email: string;
  active: boolean;
  keys: Array<{
    id: string;
    name: string;
    prefix: string;
    revoked: boolean;
    lastUsedAt: string | null;
  }>;
};

export function IntegrationsCatalog({
  envia,
  clients,
}: {
  envia: EnviaStatus;
  clients: ClientKeys[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Envía</CardTitle>
              <Badge variant={envia.usingMock ? "warning" : envia.hasStoredToken || envia.hasEnvToken ? "success" : "destructive"}>
                {envia.usingMock ? "Modo simulado" : envia.hasStoredToken || envia.hasEnvToken ? "Conectado" : "Sin token"}
              </Badge>
            </div>
            <CardDescription>
              Conexión de operador. El token nunca se muestra; cámbialo en Configuración.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <StatusLine
              label="Token en Configuración"
              value={envia.hasStoredToken ? "Presente" : "No guardado"}
              ok={envia.hasStoredToken}
            />
            <StatusLine
              label="Variable ENVIA_TOKEN"
              value={envia.hasEnvToken ? "Presente" : "Vacía"}
              ok={envia.hasEnvToken}
            />
            <StatusLine
              label="Ambiente"
              value={envia.environment === "production" ? "Producción" : "Sandbox"}
              ok
            />
            <StatusLine
              label="Modo"
              value={envia.usingMock ? "Simulado (no llama a Envía)" : "En vivo"}
              ok={!envia.usingMock}
            />
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/configuracion">Ir a Configuración</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>iVoy</CardTitle>
              <Badge variant="outline">Próximamente</Badge>
            </div>
            <CardDescription>
              Hook de proveedor listo en código (`PROVIDER_NOT_IMPLEMENTED`). Cotización y compra
              iVoy no están en vivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Cuando se active, aparecerá aquí el estado de credenciales — igual que Envía — sin mezclar
            secretos en este catálogo.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Mercado Pago</CardTitle>
              <Badge variant="outline">Próximamente</Badge>
            </div>
            <CardDescription>
              Checkout para que el cliente recargue su saldo. Hoy las cargas son manuales en
              Clientes (Cargar saldo).
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Facturación ya registra las cargas (`TOP_UP`) para el estado de cuenta. El cobro MP se
            conectará después, sin cambiar el ledger.
          </CardContent>
        </Card>
      </div>

      <ApiKeysCatalog clients={clients} />
    </div>
  );
}

function StatusLine({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={ok ? "font-medium text-navy" : "font-medium text-destructive"}>{value}</span>
    </div>
  );
}

function ApiKeysCatalog({ clients }: { clients: ClientKeys[] }) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [plainKey, setPlainKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [keyName, setKeyName] = useState("API");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((client) =>
      [client.companyName, client.email].join(" ").toLowerCase().includes(q),
    );
  }, [clients, query]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>API keys por cliente</CardTitle>
        <CardDescription>
          Prefijos visibles. La llave completa solo aparece una vez al generarla. Revoca las que ya
          no uses.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
          <Input
            placeholder="Buscar cliente"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Field label="Nombre de la key" htmlFor="new-key-name">
            <Input
              id="new-key-name"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="API"
            />
          </Field>
        </div>

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

        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Prefijos</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No hay clientes.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="font-medium">{client.companyName}</div>
                      <div className="text-xs text-muted-foreground">{client.email}</div>
                      {!client.active ? <Badge variant="destructive">Inactivo</Badge> : null}
                    </TableCell>
                    <TableCell>
                      {client.keys.length === 0 ? (
                        <span className="text-muted-foreground">Sin keys</span>
                      ) : (
                        <ul className="space-y-1">
                          {client.keys.map((key) => (
                            <li key={key.id} className="flex flex-wrap items-center gap-2">
                              <code className="font-mono text-xs">
                                {key.name} · {key.prefix}…
                              </code>
                              {key.revoked ? <Badge variant="destructive">revocada</Badge> : null}
                              {key.lastUsedAt ? (
                                <span className="text-xs text-muted-foreground">
                                  {formatDateTimeMx(key.lastUsedAt)}
                                </span>
                              ) : null}
                              {!key.revoked ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => revokeApiKeyAction(key.id)}
                                >
                                  Revocar
                                </Button>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          setError(null);
                          const result = await createApiKeyAction(client.id, keyName.trim() || "API");
                          if (!result.ok) setError(result.error);
                          else setPlainKey(result.apiKey);
                        }}
                      >
                        Generar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-3 md:hidden">
          {filtered.map((client) => (
            <div key={client.id} className="rounded-lg border border-navy/10 p-3 text-sm">
              <p className="font-medium">{client.companyName}</p>
              <p className="text-xs text-muted-foreground">{client.email}</p>
              <div className="mt-2 space-y-1">
                {client.keys.length === 0 ? (
                  <p className="text-muted-foreground">Sin keys</p>
                ) : (
                  client.keys.map((key) => (
                    <div key={key.id} className="flex items-center justify-between gap-2">
                      <code className="text-xs">
                        {key.name} · {key.prefix}…
                      </code>
                      {!key.revoked ? (
                        <Button size="sm" variant="ghost" onClick={() => revokeApiKeyAction(key.id)}>
                          Revocar
                        </Button>
                      ) : (
                        <Badge variant="destructive">revocada</Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
              <Button
                className="mt-2"
                size="sm"
                variant="secondary"
                onClick={async () => {
                  setError(null);
                  const result = await createApiKeyAction(client.id, keyName.trim() || "API");
                  if (!result.ok) setError(result.error);
                  else setPlainKey(result.apiKey);
                }}
              >
                Generar
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
