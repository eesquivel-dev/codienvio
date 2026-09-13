"use client";

import { useState } from "react";
import Link from "next/link";
import { BookmarkPlus } from "lucide-react";
import { Field } from "@/components/field";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatSavedAddressLine,
  formatSavedPackageLine,
  matchesAddressRole,
  packageTypeLabel,
  savedAddressTypeLabel,
  type SavedAddressDTO,
  type SavedPackageDTO,
} from "@/lib/saved-presets";

export function AddressPresetBar({
  role,
  addresses,
  onApply,
  onSave,
  saving,
}: {
  role: "origin" | "destination";
  addresses: SavedAddressDTO[];
  onApply: (address: SavedAddressDTO) => void;
  onSave: (input: { label: string; type: SavedAddressDTO["type"] }) => Promise<boolean>;
  saving?: boolean;
}) {
  const options = addresses.filter((item) => matchesAddressRole(item.type, role));
  const defaultType = role === "origin" ? "ORIGIN" : "DESTINATION";
  const [selectedId, setSelectedId] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<SavedAddressDTO["type"]>(defaultType);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-3 rounded-md bg-muted/50 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field label="Usar de la libreta" htmlFor={`${role}-saved`} className="flex-1">
          <NativeSelect
            id={`${role}-saved`}
            value={selectedId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedId(id);
              const match = options.find((item) => item.id === id);
              if (match) onApply(match);
            }}
          >
            <option value="">{options.length ? "Elegir dirección…" : "Sin direcciones guardadas"}</option>
            {options.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} · {savedAddressTypeLabel(item.type)} · {formatSavedAddressLine(item)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link href="/portal/libreta">Administrar</Link>
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Field label="Alias para guardar" htmlFor={`${role}-save-label`}>
          <Input
            id={`${role}-save-label`}
            value={label}
            placeholder={role === "origin" ? "Bodega CDMX" : "Cliente Monterrey"}
            onChange={(e) => setLabel(e.target.value)}
          />
        </Field>
        <Field label="Uso" htmlFor={`${role}-save-type`}>
          <NativeSelect
            id={`${role}-save-type`}
            value={type}
            onChange={(e) => setType(e.target.value as SavedAddressDTO["type"])}
          >
            <option value="BOTH">Ambos</option>
            <option value="ORIGIN">Origen</option>
            <option value="DESTINATION">Destino</option>
          </NativeSelect>
        </Field>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={async () => {
            setMessage(null);
            const ok = await onSave({ label: label.trim(), type });
            if (ok) {
              setLabel("");
              setMessage("Guardada en la libreta.");
            }
          }}
        >
          <BookmarkPlus className="h-4 w-4" />
          Guardar
        </Button>
      </div>
      {message ? <p className="text-xs text-navy">{message}</p> : null}
    </div>
  );
}

export function PackagePresetBar({
  packages,
  onApply,
  onSave,
  saving,
}: {
  packages: SavedPackageDTO[];
  onApply: (item: SavedPackageDTO) => void;
  onSave: (input: { nickname: string }) => Promise<boolean>;
  saving?: boolean;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-3 rounded-md bg-muted/50 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field label="Usar paquete guardado" htmlFor="pkg-saved" className="flex-1">
          <NativeSelect
            id="pkg-saved"
            value={selectedId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedId(id);
              const match = packages.find((item) => item.id === id);
              if (match) onApply(match);
            }}
          >
            <option value="">{packages.length ? "Elegir paquete…" : "Sin paquetes guardados"}</option>
            {packages.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nickname} · {packageTypeLabel(item.type)} · {formatSavedPackageLine(item)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link href="/portal/libreta">Administrar</Link>
        </Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field label="Alias para guardar" htmlFor="pkg-save-nick" className="flex-1">
          <Input
            id="pkg-save-nick"
            value={nickname}
            placeholder="Caja ropa"
            onChange={(e) => setNickname(e.target.value)}
          />
        </Field>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={async () => {
            setMessage(null);
            const ok = await onSave({ nickname: nickname.trim() });
            if (ok) {
              setNickname("");
              setMessage("Guardado en la libreta.");
            }
          }}
        >
          <BookmarkPlus className="h-4 w-4" />
          Guardar
        </Button>
      </div>
      {message ? <p className="text-xs text-navy">{message}</p> : null}
    </div>
  );
}
