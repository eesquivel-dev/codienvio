"use client";

import { useState } from "react";
import { testEnviaAction, updateSettingsAction } from "@/app/admin/actions";
import { Field } from "@/components/field";
import { NativeSelect } from "@/components/native-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
    <form action={onSubmit} className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Conexión Envia</CardTitle>
            <Badge variant={settings.usingMock ? "warning" : "success"}>
              {settings.usingMock ? "Modo simulado" : "Envia en vivo"}
            </Badge>
          </div>
          <CardDescription>
            Token guardado: {settings.hasStoredToken ? "sí" : "no"}. Variable ENVIA_TOKEN:{" "}
            {settings.hasEnvToken ? "presente" : "vacía"}. En producción, /ship/rate/ cotiza por
            paquetería (Estafeta, DHL, FedEx, UPS, Paquetexpress, Redpack).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field
            label="Token de Envia"
            htmlFor="enviaToken"
            hint="JWT de developers. Déjalo vacío para conservar el actual."
          >
            <Input
              id="enviaToken"
              name="enviaToken"
              type="password"
              autoComplete="off"
              placeholder={
                settings.hasStoredToken ? "Deja vacío para conservar el actual" : "Bearer JWT de Envia"
              }
            />
          </Field>
          <Field label="Ambiente" htmlFor="enviaEnvironment">
            <NativeSelect
              id="enviaEnvironment"
              name="enviaEnvironment"
              defaultValue={settings.enviaEnvironment}
            >
              <option value="sandbox">Sandbox (api-test.envia.com)</option>
              <option value="production">Producción (api.envia.com)</option>
            </NativeSelect>
          </Field>
          <Field
            label="Modo simulado"
            hint="Útil sin token: tarifas demo y PDF de ejemplo. No llama a Envia."
          >
            <label className="flex h-9 items-center gap-2 text-sm">
              <input type="checkbox" name="mockMode" defaultChecked={settings.mockMode} />
              Cotizar y comprar sin llamar a Envia
            </label>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comisión global</CardTitle>
          <CardDescription>
            Markup sobre el costo Envia: precio = costo + (costo × %) + cargo fijo MXN. Por
            defecto 20% y $0 fijo. Puedes overridear por cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field
            label="Comisión % global"
            htmlFor="defaultFeePercent"
            hint="Porcentaje del costo Envia. Por defecto 20%."
          >
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
          <Field
            label="Comisión fija MXN"
            htmlFor="defaultFeeFixedMxn"
            hint="Cargo fijo adicional. Por defecto $0."
          >
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
        </CardContent>
      </Card>

      <div className="space-y-3 lg:col-span-2">
        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-md border border-lima/40 bg-lima/15 px-3 py-2 text-sm text-navy">
            {message}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
          <Button type="button" variant="outline" onClick={onTest} disabled={testing}>
            {testing ? "Probando…" : "Probar conexión Envia"}
          </Button>
        </div>
      </div>
    </form>
  );
}
