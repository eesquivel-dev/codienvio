"use client";

import { useMemo, useState } from "react";
import {
  createApiKeyAction,
  createClientAction,
  revokeApiKeyAction,
  toggleClientAction,
  updateClientAction,
} from "@/app/admin/actions";
import { WalletPanel } from "@/app/admin/clientes/wallet-panel";
import { CatalogDrawer } from "@/components/catalog-drawer";
import { Field } from "@/components/field";
import { ListFilters } from "@/components/list-filters";
import { NativeSelect } from "@/components/native-select";
import { matchesQuery } from "@/lib/catalog-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTimeMx } from "@/lib/format";
import { formatMxn } from "@/lib/money";
import {
  formatSavedAddressLine,
  formatSavedPackageLine,
  packageTypeLabel,
  savedAddressTypeLabel,
  type SavedAddressDTO,
  type SavedPackageDTO,
} from "@/lib/saved-presets";
import type { WalletLedgerRow } from "@/lib/wallet-copy";

export type AdminClientKey = {
  id: string;
  name: string;
  prefix: string;
  revoked: boolean;
  lastUsedAt: string | null;
};

export type AdminClientRow = {
  id: string;
  companyName: string;
  email: string;
  name: string;
  active: boolean;
  feePercent: number | null;
  feeFixedMxn: number | null;
  balanceMxn: number;
  balanceLabel: string;
  createdAt: string;
  ledger: WalletLedgerRow[];
  keys: AdminClientKey[];
  savedAddresses: SavedAddressDTO[];
  savedPackages: SavedPackageDTO[];
};

export function ClientsManager({
  clients,
  defaultFeePercent,
  defaultFeeFixedMxn,
}: {
  clients: AdminClientRow[];
  defaultFeePercent: number;
  defaultFeeFixedMxn: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [plainKey, setPlainKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive" | "zero">("all");
  const [copied, setCopied] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = clients.find((client) => client.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    return clients.filter((client) => {
      if (status === "active" && !client.active) return false;
      if (status === "inactive" && client.active) return false;
      if (status === "zero" && client.balanceMxn !== 0) return false;
      return matchesQuery([client.companyName, client.email, client.name], query);
    });
  }, [clients, query, status]);

  async function onCreate(formData: FormData) {
    setError(null);
    setPlainKey(null);
    const result = await createClientAction(formData);
    if (!result.ok) setError(result.error);
    else setShowCreate(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" className="sm:ml-auto" onClick={() => setShowCreate((value) => !value)}>
          {showCreate ? "Cerrar alta" : "Nuevo cliente"}
        </Button>
      </div>

      {showCreate ? (
        <Card>
          <CardHeader>
            <CardTitle>Nuevo cliente</CardTitle>
            <CardDescription>
              Deja las comisiones vacías para usar la regla global (por defecto {defaultFeePercent}%
              del costo Envia, {formatMxn(defaultFeeFixedMxn)} fijo). El saldo prepagado empieza en
              $0; cárgalo en el detalle después de crear la cuenta.
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
      ) : null}

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

      <ListFilters
        query={query}
        onQueryChange={setQuery}
        placeholder="Buscar por empresa, nombre o correo"
        resultCount={filtered.length}
        totalCount={clients.length}
        noun="clientes"
        hasActiveFilters={Boolean(query.trim() || status !== "all")}
        onClear={() => {
          setQuery("");
          setStatus("all");
        }}
      >
        <Field label="Estado" htmlFor="client-status">
          <NativeSelect
            id="client-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="zero">Saldo en $0</option>
          </NativeSelect>
        </Field>
      </ListFilters>

      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead>API keys</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    {clients.length === 0
                      ? "Aún no hay clientes."
                      : "Ningún cliente coincide con los filtros."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((client) => {
                  const activeKeys = client.keys.filter((key) => !key.revoked).length;
                  return (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(client.id)}
                    >
                      <TableCell>
                        <div className="font-medium">{client.companyName}</div>
                        <div className="text-xs text-muted-foreground">
                          Alta {formatDateTimeMx(client.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{client.name}</div>
                        <div className="text-xs text-muted-foreground">{client.email}</div>
                      </TableCell>
                      <TableCell className="font-semibold tabular-nums text-navy">
                        {client.balanceLabel}
                      </TableCell>
                      <TableCell className="text-sm">
                        {feeLabel(client, defaultFeePercent, defaultFeeFixedMxn)}
                      </TableCell>
                      <TableCell>
                        {activeKeys} activas
                        {client.keys.length !== activeKeys ? ` / ${client.keys.length}` : ""}
                      </TableCell>
                      <TableCell>
                        <Badge variant={client.active ? "success" : "destructive"}>
                          {client.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay clientes que coincidan.</p>
        ) : (
          filtered.map((client) => (
            <Card key={client.id} className="cursor-pointer" onClick={() => setSelectedId(client.id)}>
              <CardContent className="space-y-2 pt-6 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{client.companyName}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.name} · {client.email}
                    </p>
                  </div>
                  <Badge variant={client.active ? "success" : "destructive"}>
                    {client.active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <p className="font-semibold tabular-nums text-navy">{client.balanceLabel}</p>
                <p className="text-muted-foreground">
                  {feeLabel(client, defaultFeePercent, defaultFeeFixedMxn)}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selected ? (
        <ClientDrawer
          client={selected}
          defaultFeePercent={defaultFeePercent}
          defaultFeeFixedMxn={defaultFeeFixedMxn}
          onClose={() => setSelectedId(null)}
          onError={setError}
          onPlainKey={setPlainKey}
        />
      ) : null}
    </div>
  );
}

function AdminClientAddressBook({
  addresses,
  packages,
}: {
  addresses: SavedAddressDTO[];
  packages: SavedPackageDTO[];
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "addresses" | "packages">("all");

  const filteredAddresses = addresses.filter((address) =>
    matchesQuery(
      [address.label, address.name, address.company, address.city, address.postalCode, address.phone],
      query,
    ),
  );
  const filteredPackages = packages.filter((item) =>
    matchesQuery([item.nickname, item.content, item.type], query),
  );
  const showAddresses = kind !== "packages";
  const showPackages = kind !== "addresses";

  return (
    <div className="space-y-2 rounded-lg bg-muted/50 p-3">
      <p className="type-overline text-muted-foreground">Libreta del cliente</p>
      <p className="text-xs text-muted-foreground">
        Solo lectura. El cliente administra direcciones y paquetes en el portal.
      </p>
      {addresses.length === 0 && packages.length === 0 ? (
        <p className="text-muted-foreground">Sin direcciones ni paquetes guardados.</p>
      ) : (
        <div className="space-y-3">
          <ListFilters
            query={query}
            onQueryChange={setQuery}
            placeholder="Buscar alias, ciudad, C.P. o contenido"
            resultCount={(showAddresses ? filteredAddresses.length : 0) + (showPackages ? filteredPackages.length : 0)}
            totalCount={addresses.length + packages.length}
            noun="registros"
            hasActiveFilters={Boolean(query.trim() || kind !== "all")}
            onClear={() => {
              setQuery("");
              setKind("all");
            }}
          >
            <Field label="Tipo" htmlFor="admin-libreta-kind">
              <NativeSelect
                id="admin-libreta-kind"
                value={kind}
                onChange={(event) => setKind(event.target.value as typeof kind)}
              >
                <option value="all">Direcciones y paquetes</option>
                <option value="addresses">Solo direcciones</option>
                <option value="packages">Solo paquetes</option>
              </NativeSelect>
            </Field>
          </ListFilters>
          {showAddresses && filteredAddresses.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-navy">Direcciones ({filteredAddresses.length})</p>
              <ul className="space-y-2">
                {filteredAddresses.map((address) => (
                  <li key={address.id} className="rounded-md border border-navy/10 bg-white p-2">
                    <p className="font-medium">
                      {address.label}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        · {savedAddressTypeLabel(address.type)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">{formatSavedAddressLine(address)}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {showPackages && filteredPackages.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-navy">Paquetes ({filteredPackages.length})</p>
              <ul className="space-y-2">
                {filteredPackages.map((item) => (
                  <li key={item.id} className="rounded-md border border-navy/10 bg-white p-2">
                    <p className="font-medium">
                      {item.nickname}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        · {packageTypeLabel(item.type)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">{formatSavedPackageLine(item)}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {(showAddresses ? filteredAddresses.length : 0) + (showPackages ? filteredPackages.length : 0) === 0 ? (
            <p className="text-muted-foreground">Ningún registro coincide con los filtros.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function feeLabel(
  client: Pick<AdminClientRow, "feePercent" | "feeFixedMxn">,
  defaultFeePercent: number,
  defaultFeeFixedMxn: number,
) {
  if (client.feePercent === null && client.feeFixedMxn === null) {
    return `Global ${defaultFeePercent}% + ${formatMxn(defaultFeeFixedMxn)}`;
  }
  return `${client.feePercent ?? defaultFeePercent}% + ${formatMxn(client.feeFixedMxn ?? defaultFeeFixedMxn)}`;
}

function ClientDrawer({
  client,
  defaultFeePercent,
  defaultFeeFixedMxn,
  onClose,
  onError,
  onPlainKey,
}: {
  client: AdminClientRow;
  defaultFeePercent: number;
  defaultFeeFixedMxn: number;
  onClose: () => void;
  onError: (message: string | null) => void;
  onPlainKey: (key: string | null) => void;
}) {
  const [saving, setSaving] = useState(false);
  const usesGlobal = client.feePercent === null && client.feeFixedMxn === null;

  async function onUpdate(formData: FormData) {
    setSaving(true);
    onError(null);
    formData.set("clientId", client.id);
    const result = await updateClientAction(formData);
    setSaving(false);
    if (!result.ok) onError(result.error);
  }

  return (
    <CatalogDrawer
      title={client.companyName}
      subtitle={`${client.name} · ${client.email}`}
      onClose={onClose}
    >
      <div className="space-y-5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
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

        <form action={onUpdate} className="space-y-3 rounded-lg border border-navy/10 p-3">
          <p className="type-overline text-muted-foreground">Empresa y comisión</p>
          <Field label="Empresa" htmlFor={`company-${client.id}`}>
            <Input
              id={`company-${client.id}`}
              name="companyName"
              defaultValue={client.companyName}
              required
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Comisión %"
              htmlFor={`fee-p-${client.id}`}
              hint={usesGlobal ? `Vacío = global ${defaultFeePercent}%` : "Override de cliente"}
            >
              <Input
                id={`fee-p-${client.id}`}
                name="feePercent"
                type="number"
                step="0.01"
                min="0"
                defaultValue={client.feePercent ?? ""}
                placeholder={String(defaultFeePercent)}
              />
            </Field>
            <Field
              label="Comisión fija MXN"
              htmlFor={`fee-f-${client.id}`}
              hint={usesGlobal ? `Vacío = global ${formatMxn(defaultFeeFixedMxn)}` : "Override de cliente"}
            >
              <Input
                id={`fee-f-${client.id}`}
                name="feeFixedMxn"
                type="number"
                step="0.01"
                min="0"
                defaultValue={client.feeFixedMxn ?? ""}
                placeholder={String(defaultFeeFixedMxn)}
              />
            </Field>
          </div>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Guardando…" : "Guardar datos"}
          </Button>
        </form>

        <WalletPanel client={client} onError={onError} />

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
                  {key.lastUsedAt ? (
                    <span className="block text-xs text-muted-foreground">
                      Último uso {formatDateTimeMx(key.lastUsedAt)}
                    </span>
                  ) : null}
                </span>
                {!key.revoked ? (
                  <Button size="sm" variant="ghost" onClick={() => revokeApiKeyAction(key.id)}>
                    Revocar
                  </Button>
                ) : null}
              </div>
            ))
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              const result = await createApiKeyAction(client.id, "Portal");
              if (!result.ok) onError(result.error);
              else onPlainKey(result.apiKey);
            }}
          >
            Generar API key
          </Button>
        </div>

        <AdminClientAddressBook
          addresses={client.savedAddresses}
          packages={client.savedPackages}
        />
      </div>
    </CatalogDrawer>
  );
}
