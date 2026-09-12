"use client";

import { useState } from "react";
import { testEnviaAction, updateSettingsAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { Badge } from "@/components/ui/badge";

type SettingsView = {
  enviaEnvironment: string;
  defaultFeePercent: number;
  defaultFeeFixedMxn: number;
  mockMode: boolean;
  hasStoredToken: boolean;
  hasEnvToken: boolean;
  usingMock: boolean;
};

export function SettingsForm({ settings }: { settings: SettingsView }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  async function onSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    setMessage(null);
    const result = await updateSettingsAction(formData);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage("Configuración guardada.");
  }

  async function onTest() {
    setTesting(true);
    setError(null);
    setMessage(null);
    const result = await testEnviaAction();
    setTesting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(result.result.message);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Envia y comisiones</CardTitle>
          <Badge variant={settings.usingMock ? "warning" : "success"}>
            {settings.usingMock ? "Modo simulado" : "Envia en vivo"}
          </Badge>
        </div>
        <CardDescription>
          Token guardado: {settings.hasStoredToken ? "sí" : "no"}. Variable ENVIA_TOKEN:{" "}
          {settings.hasEnvToken ? "presente" : "vacía"}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Token de Envia (sandbox)" htmlFor="enviaToken" className="sm:col-span-2">
            <Input
              id="enviaToken"
              name="enviaToken"
              type="password"
              autoComplete="off"
              placeholder={settings.hasStoredToken ? "Deja vacío para conservar el actual" : "Bearer JWT de Envia"}
            />
          </Field>
          <Field label="Ambiente" htmlFor="enviaEnvironment">
            <select
              id="enviaEnvironment"
              name="enviaEnvironment"
              defaultValue={settings.enviaEnvironment}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
            >
              <option value="sandbox">Sandbox (api-test.envia.com)</option>
              <option value="production">Producción (api.envia.com)</option>
            </select>
          </Field>
          <Field label="Modo simulado">
            <label className="flex h-9 items-center gap-2 text-sm">
              <input type="checkbox" name="mockMode" defaultChecked={settings.mockMode} />
              Cotizar y comprar sin llamar a Envia
            </label>
          </Field>
          <Field label="Comisión % global" htmlFor="defaultFeePercent">
            <Input
              id="defaultFeePercent"
              name="defaultFeePercent"
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue={settings.defaultFeePercent}
              required
            />
          </Field>
          <Field label="Comisión fija MXN" htmlFor="defaultFeeFixedMxn">
            <Input
              id="defaultFeeFixedMxn"
              name="defaultFeeFixedMxn"
              type="number"
              step="0.01"
              min="0"
              defaultValue={settings.defaultFeeFixedMxn}
              required
            />
          </Field>
          {error ? <p className="sm:col-span-2 text-sm text-destructive">{error}</p> : null}
          {message ? <p className="sm:col-span-2 text-sm text-emerald-700">{message}</p> : null}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
            <Button type="button" variant="outline" onClick={onTest} disabled={testing}>
              {testing ? "Probando…" : "Probar conexión Envia"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
