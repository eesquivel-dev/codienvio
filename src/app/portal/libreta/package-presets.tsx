"use client";

import { useState } from "react";
import {
  createSavedPackageAction,
  deleteSavedPackageAction,
  updateSavedPackageAction,
} from "@/app/portal/actions";
import { Field } from "@/components/field";
import { NativeSelect } from "@/components/native-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  formatSavedPackageLine,
  packageTypeLabel,
  type SavedPackageDTO,
} from "@/lib/saved-presets";

const emptyForm = {
  nickname: "",
  type: "box" as SavedPackageDTO["type"],
  content: "",
  weightKg: "",
  lengthCm: "",
  widthCm: "",
  heightCm: "",
  declaredValueMxn: "",
};

export function PackagePresets({ initialPackages }: { initialPackages: SavedPackageDTO[] }) {
  const [packages, setPackages] = useState(initialPackages);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
    setError(null);
  }

  function startEdit(item: SavedPackageDTO) {
    setEditingId(item.id);
    setForm({
      nickname: item.nickname,
      type: item.type,
      content: item.content,
      weightKg: String(item.weightKg),
      lengthCm: String(item.lengthCm),
      widthCm: String(item.widthCm),
      heightCm: String(item.heightCm),
      declaredValueMxn: String(item.declaredValueMxn),
    });
    setOpen(true);
    setError(null);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      nickname: form.nickname,
      type: form.type,
      content: form.content,
      weightKg: Number(form.weightKg),
      lengthCm: Number(form.lengthCm),
      widthCm: Number(form.widthCm),
      heightCm: Number(form.heightCm),
      declaredValueMxn: Number(form.declaredValueMxn),
    };
    const result = editingId
      ? await updateSavedPackageAction({ ...payload, id: editingId })
      : await createSavedPackageAction(payload);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPackages((prev) => {
      const next = prev.filter((item) => item.id !== result.package.id);
      return [result.package, ...next];
    });
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function onDelete(id: string) {
    if (!window.confirm("¿Eliminar este paquete de la libreta?")) return;
    const result = await deleteSavedPackageAction(id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPackages((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) {
      setOpen(false);
      setEditingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Paquetes</CardTitle>
          <CardDescription>Presets de peso, medidas, contenido y valor declarado.</CardDescription>
        </div>
        <Button type="button" onClick={startCreate}>
          Nuevo paquete
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {open ? (
          <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border border-navy/10 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Alias" htmlFor="pkg-nick" className="sm:col-span-2 lg:col-span-3">
              <Input
                id="pkg-nick"
                value={form.nickname}
                placeholder="Caja ropa"
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                required
              />
            </Field>
            <Field label="Tipo" htmlFor="pkg-type">
              <NativeSelect
                id="pkg-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as SavedPackageDTO["type"] })}
              >
                <option value="box">Caja</option>
                <option value="envelope">Sobre</option>
                <option value="pallet">Tarima</option>
              </NativeSelect>
            </Field>
            <Field label="Contenido" htmlFor="pkg-content" className="sm:col-span-2">
              <Input
                id="pkg-content"
                value={form.content}
                placeholder="Ropa"
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                required
              />
            </Field>
            <Field label="Peso (kg)" htmlFor="pkg-weight">
              <Input
                id="pkg-weight"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={form.weightKg}
                onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                required
              />
            </Field>
            <Field label="Largo (cm)" htmlFor="pkg-length">
              <Input
                id="pkg-length"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="1"
                value={form.lengthCm}
                onChange={(e) => setForm({ ...form, lengthCm: e.target.value })}
                required
              />
            </Field>
            <Field label="Ancho (cm)" htmlFor="pkg-width">
              <Input
                id="pkg-width"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="1"
                value={form.widthCm}
                onChange={(e) => setForm({ ...form, widthCm: e.target.value })}
                required
              />
            </Field>
            <Field label="Alto (cm)" htmlFor="pkg-height">
              <Input
                id="pkg-height"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="1"
                value={form.heightCm}
                onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                required
              />
            </Field>
            <Field label="Valor declarado (MXN)" htmlFor="pkg-value" className="sm:col-span-2 lg:col-span-2">
              <Input
                id="pkg-value"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={form.declaredValueMxn}
                onChange={(e) => setForm({ ...form, declaredValueMxn: e.target.value })}
                required
              />
            </Field>
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
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

        {packages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay paquetes. Guarda medidas frecuentes para cotizar más rápido.</p>
        ) : (
          <ul className="space-y-3">
            {packages.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-lg border border-navy/10 p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-navy">{item.nickname}</p>
                    <Badge variant="secondary">{packageTypeLabel(item.type)}</Badge>
                  </div>
                  <p className="text-sm">{item.content}</p>
                  <p className="text-sm text-muted-foreground">{formatSavedPackageLine(item)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => startEdit(item)}>
                    Editar
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => onDelete(item.id)}>
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
