"use client";

import { useState, useTransition } from "react";
import { regenerateOwnApiKeyAction } from "@/app/portal/api/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ActiveKey = { prefix: string; createdAt: string; lastUsedAt: string | null };

export const SAMPLE_RATES_BODY = {
  origin: {
    name: "Edgar Esquivel",
    phone: "5551234567",
    street: "Av. Insurgentes Sur",
    number: "1647",
    city: "Ciudad de México",
    state: "CX",
    postalCode: "03920",
    country: "MX",
  },
  destination: {
    name: "Ana López",
    phone: "8181234567",
    street: "Av. Constitución",
    number: "123",
    city: "Monterrey",
    state: "NL",
    postalCode: "64060",
    country: "MX",
  },
  packages: [
    { type: "box", content: "Ropa", weightKg: 0.5, lengthCm: 30, widthCm: 20, heightCm: 10, declaredValueMxn: 450 },
  ],
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "nunca";

export function ApiConsole({ baseUrl, activeKeys }: { baseUrl: string; activeKeys: ActiveKey[] }) {
  const [apiKey, setApiKey] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyMsg, setKeyMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState(JSON.stringify(SAMPLE_RATES_BODY, null, 2));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ status: number; text: string } | null>(null);

  function regenerate() {
    if (
      activeKeys.length > 0 &&
      !window.confirm("Se revocará tu key actual y cualquier integración que la use dejará de funcionar. ¿Continuar?")
    ) {
      return;
    }
    setKeyMsg(null);
    startTransition(async () => {
      const res = await regenerateOwnApiKeyAction();
      if (res.ok) {
        setNewKey(res.apiKey);
        setApiKey(res.apiKey);
        setCopied(false);
      } else {
        setKeyMsg(res.error);
      }
    });
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function runTest() {
    setResult(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      setResult({ status: 0, text: "El cuerpo no es JSON válido." });
      return;
    }
    if (!apiKey.trim()) {
      setResult({ status: 0, text: "Pega tu API key (o genera una arriba) para probar." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${baseUrl}/v1/rates`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey.trim()}`, "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {}
      setResult({ status: res.status, text: pretty });
    } catch (error) {
      setResult({ status: 0, text: `No se pudo llamar a la API: ${(error as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  const curl = `curl -X POST ${baseUrl}/v1/rates \\\n  -H "Authorization: Bearer ${apiKey.trim() || "TU_API_KEY"}" \\\n  -H "Content-Type: application/json" \\\n  -d @cotizacion.json`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tu API key</CardTitle>
          <CardDescription>
            Solo ves las keys de tu cuenta. Por seguridad guardamos únicamente un hash: la key completa se muestra una sola
            vez al generarla. Si la perdiste, regénerala.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeKeys.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {activeKeys.map((k) => (
                <li key={k.prefix}>
                  <code>{k.prefix}…</code> · creada {fmt(k.createdAt)} · último uso {fmt(k.lastUsedAt)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aún no tienes una API key activa.</p>
          )}
          <Button type="button" onClick={regenerate} disabled={pending}>
            {pending ? "Generando…" : activeKeys.length > 0 ? "Regenerar API key" : "Generar API key"}
          </Button>
          {keyMsg && <p className="text-sm text-destructive">{keyMsg}</p>}
          {newKey && (
            <div className="space-y-2 rounded-md border border-lima bg-white p-3">
              <p className="text-sm font-semibold text-navy">Tu nueva API key (cópiala ahora; no se volverá a mostrar):</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="break-all rounded bg-papel px-2 py-1 text-xs" data-testid="new-api-key">
                  {newKey}
                </code>
                <Button type="button" variant="outline" size="sm" onClick={() => copy(newKey)}>
                  {copied ? "¡Copiada!" : "Copiar"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cotización de prueba · POST /v1/rates</CardTitle>
          <CardDescription>
            Llama a la API real con tu key. Solo cotiza: no compra guías ni cobra saldo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="api-key">API key</Label>
            <Input
              id="api-key"
              type="password"
              autoComplete="off"
              placeholder="ce_live_…"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="api-body">Cuerpo (JSON)</Label>
            <Textarea
              id="api-body"
              rows={14}
              className="font-mono text-xs"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={runTest} disabled={busy}>
              {busy ? "Cotizando…" : "Enviar cotización de prueba"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setBody(JSON.stringify(SAMPLE_RATES_BODY, null, 2))}>
              Restaurar ejemplo
            </Button>
            <Button type="button" variant="outline" onClick={() => copy(curl)}>
              Copiar curl
            </Button>
          </div>
          {result && (
            <div className="space-y-1">
              <p className="text-sm font-semibold" data-testid="api-status">
                {result.status ? `HTTP ${result.status}` : "Error"}
              </p>
              <pre className="max-h-96 overflow-auto rounded-md bg-navy p-4 text-xs text-white" data-testid="api-result">
                {result.text}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
