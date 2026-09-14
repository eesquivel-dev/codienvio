"use client";

import { useMemo, useState } from "react";
import {
  createSavedAddressAction,
  deleteSavedAddressAction,
  updateSavedAddressAction,
} from "@/app/portal/actions";
import { Field } from "@/components/field";
import { ListFilters } from "@/components/list-filters";
import { NativeSelect } from "@/components/native-select";
import { matchesQuery } from "@/lib/catalog-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MX_STATES } from "@/lib/mexico";
import {
  formatSavedAddressLine,
  savedAddressTypeLabel,
  type SavedAddressDTO,
} from "@/lib/saved-presets";

const emptyForm = {
  label: "",
  type: "BOTH" as SavedAddressDTO["type"],
  name: "",
  company: "",
  email: "",
  phone: "",
  street: "",
  number: "",
  district: "",
  city: "",
  state: "CX",
  postalCode: "",
  reference: "",
};

export function AddressBook({ initialAddresses }: { initialAddresses: SavedAddressDTO[] }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | SavedAddressDTO["type"]>("all");

  const filtered = useMemo(() => {
    return addresses.filter((address) => {
      if (typeFilter !== "all" && address.type !== typeFilter) return false;
      return matchesQuery(
        [
          address.label,
          address.name,
          address.company,
          address.city,
          address.state,
          address.postalCode,
          address.phone,
          address.email,
          address.street,
        ],
        query,
      );
    });
  }, [addresses, query, typeFilter]);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
    setError(null);
  }

  function startEdit(address: SavedAddressDTO) {
    setEditingId(address.id);
    setForm({
      label: address.label,
      type: address.type,
      name: address.name,
      company: address.company,
      email: address.email,
      phone: address.phone,
      street: address.street,
      number: address.number,
      district: address.district,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      reference: address.reference,
    });
    setOpen(true);
    setError(null);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const payload = { ...form, country: "MX" as const };
    const result = editingId
      ? await updateSavedAddressAction({ ...payload, id: editingId })
      : await createSavedAddressAction(payload);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAddresses((prev) => {
      const next = prev.filter((item) => item.id !== result.address.id);
      return [result.address, ...next];
    });
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function onDelete(id: string) {
    if (!window.confirm("¿Eliminar esta dirección de la libreta?")) return;
    const result = await deleteSavedAddressAction(id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAddresses((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) {
      setOpen(false);
      setEditingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Direcciones</CardTitle>
          <CardDescription>
            Contactos de origen y destino para cotizar sin volver a escribir.
          </CardDescription>
        </div>
        <Button type="button" onClick={startCreate}>
          Nueva dirección
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {open ? (
          <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border border-navy/10 p-4 sm:grid-cols-2">
            <Field label="Alias" htmlFor="addr-label" className="sm:col-span-2">
              <Input
                id="addr-label"
                value={form.label}
                placeholder="Bodega CDMX"
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                required
              />
            </Field>
            <Field label="Uso" htmlFor="addr-type">
              <NativeSelect
                id="addr-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as SavedAddressDTO["type"] })}
              >
                <option value="BOTH">Origen y destino</option>
                <option value="ORIGIN">Solo origen</option>
                <option value="DESTINATION">Solo destino</option>
              </NativeSelect>
            </Field>
            <Field label="Nombre" htmlFor="addr-name">
              <Input
                id="addr-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Empresa" htmlFor="addr-company">
              <Input
                id="addr-company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </Field>
            <Field label="Teléfono" htmlFor="addr-phone">
              <Input
                id="addr-phone"
                inputMode="tel"
                value={form.phone}
                placeholder="5551234567"
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </Field>
            <Field label="Correo" htmlFor="addr-email" className="sm:col-span-2">
              <Input
                id="addr-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Calle" htmlFor="addr-street">
              <Input
                id="addr-street"
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
                required
              />
            </Field>
            <Field label="Número" htmlFor="addr-number">
              <Input
                id="addr-number"
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
              />
            </Field>
            <Field label="C.P." htmlFor="addr-zip">
              <Input
                id="addr-zip"
                inputMode="numeric"
                maxLength={5}
                value={form.postalCode}
                onChange={(e) =>
                  setForm({ ...form, postalCode: e.target.value.replace(/\D/g, "").slice(0, 5) })
                }
                required
              />
            </Field>
            <Field label="Colonia" htmlFor="addr-district">
              <Input
                id="addr-district"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
              />
            </Field>
            <Field label="Ciudad" htmlFor="addr-city">
              <Input
                id="addr-city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
              />
            </Field>
            <Field label="Estado" htmlFor="addr-state">
              <NativeSelect
                id="addr-state"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              >
                {MX_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.code} — {state.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Referencia" htmlFor="addr-ref" className="sm:col-span-2">
              <Input
                id="addr-ref"
                value={form.reference}
                placeholder="Entre calles, color de fachada…"
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
              />
            </Field>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Guardando…" : editingId ? "Actualizar" : "Guardar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  setEditingId(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : null}

        <ListFilters
          query={query}
          onQueryChange={setQuery}
          placeholder="Buscar alias, nombre, ciudad o C.P."
          resultCount={filtered.length}
          totalCount={addresses.length}
          noun="direcciones"
          hasActiveFilters={Boolean(query.trim() || typeFilter !== "all")}
          onClear={() => {
            setQuery("");
            setTypeFilter("all");
          }}
        >
          <Field label="Uso" htmlFor="addr-filter-type">
            <NativeSelect
              id="addr-filter-type"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
            >
              <option value="all">Todos</option>
              <option value="BOTH">Origen y destino</option>
              <option value="ORIGIN">Solo origen</option>
              <option value="DESTINATION">Solo destino</option>
            </NativeSelect>
          </Field>
        </ListFilters>

        {addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay direcciones. Agrega la primera para reutilizarla al cotizar.</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ninguna dirección coincide con los filtros.</p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((address) => (
              <li
                key={address.id}
                className="flex flex-col gap-3 rounded-lg border border-navy/10 p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-navy">{address.label}</p>
                    <Badge variant="secondary">{savedAddressTypeLabel(address.type)}</Badge>
                  </div>
                  <p className="text-sm">{address.name}{address.company ? ` · ${address.company}` : ""}</p>
                  <p className="text-sm text-muted-foreground">{formatSavedAddressLine(address)}</p>
                  <p className="text-xs text-muted-foreground">{address.phone}{address.email ? ` · ${address.email}` : ""}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => startEdit(address)}>
                    Editar
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => onDelete(address.id)}>
                    Eliminar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
