"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2, Package, Sparkles } from "lucide-react";
import { buyAction, quoteAction } from "@/app/portal/actions";
import { Field } from "@/components/field";
import { NativeSelect } from "@/components/native-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { carrierLabel, formatTimeMx } from "@/lib/format";
import { MX_STATES } from "@/lib/mexico";
import { formatMxn } from "@/lib/money";
import type { ZipLookup } from "@/lib/providers/types";
import { cn } from "@/lib/utils";
import { quoteRequestSchema } from "@/lib/validations";
import {
  applyZipLookup,
  isCompletePostalCode,
  zipFieldMessage,
  type ZipFieldStatus,
} from "@/lib/zip-address";

type AddressState = {
  name: string;
  company: string;
  email: string;
  phone: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  postalCode: string;
  reference: string;
};

type Rate = {
  id: string;
  carrier: string;
  service: string;
  serviceName: string;
  deliveryEstimate: string | null;
  currency: string;
  price: number;
};

const emptyAddress = (state = "CX"): AddressState => ({
  name: "",
  company: "",
  email: "",
  phone: "",
  street: "",
  number: "",
  district: "",
  city: "",
  state,
  postalCode: "",
  reference: "",
});

const demoOrigin: AddressState = {
  name: "Edgar Esquivel",
  company: "CodiEnvio Demo",
  email: "edgar@codienvio.mx",
  phone: "5551234567",
  street: "Av. Insurgentes Sur",
  number: "1647",
  district: "Insurgentes Mixcoac",
  city: "Ciudad de México",
  state: "CX",
  postalCode: "03920",
  reference: "Local 3",
};

const demoDestination: AddressState = {
  name: "Ana López",
  company: "",
  email: "ana@example.com",
  phone: "8181234567",
  street: "Av. Constitución",
  number: "123",
  district: "Centro",
  city: "Monterrey",
  state: "NL",
  postalCode: "64060",
  reference: "",
};

function fieldError(errors: Record<string, string>, ...keys: string[]) {
  return keys.map((key) => errors[key]).find(Boolean);
}

export function QuoteForm() {
  const [origin, setOrigin] = useState<AddressState>(emptyAddress("CX"));
  const [destination, setDestination] = useState<AddressState>(emptyAddress("NL"));
  const [pkg, setPkg] = useState({
    content: "",
    weightKg: "",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
    declaredValueMxn: "",
  });
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [rates, setRates] = useState<Rate[]>([]);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [boughtId, setBoughtId] = useState<string | null>(null);

  const payload = useMemo(
    () => ({
      origin: { ...origin, country: "MX" as const },
      destination: { ...destination, country: "MX" as const },
      packages: [
        {
          type: "box" as const,
          content: pkg.content,
          weightKg: Number(pkg.weightKg),
          lengthCm: Number(pkg.lengthCm),
          widthCm: Number(pkg.widthCm),
          heightCm: Number(pkg.heightCm),
          declaredValueMxn: Number(pkg.declaredValueMxn),
        },
      ],
    }),
    [origin, destination, pkg],
  );

  const selectedRate = rates.find((rate) => rate.id === selectedRateId) ?? null;
  const cheapestId = rates[0]?.id;

  function validateLocal() {
    const parsed = quoteRequestSchema.safeParse(payload);
    const next: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (!next[path]) next[path] = issue.message;
      }
    }
    if (!origin.district.trim()) {
      next["origin.district"] = "Selecciona una colonia";
    }
    if (!destination.district.trim()) {
      next["destination.district"] = "Selecciona una colonia";
    }
    if (Object.keys(next).length > 0) {
      setFieldErrors(next);
      setError("Revisa origen, destino y el paquete. Los campos marcados son obligatorios.");
      return false;
    }
    setFieldErrors({});
    return true;
  }

  async function onQuote(event: React.FormEvent) {
    event.preventDefault();
    if (!validateLocal()) return;
    setLoading(true);
    setError(null);
    setBoughtId(null);
    setSelectedRateId(null);
    try {
      const result = await quoteAction(payload);
      if (!result.ok) {
        setError(result.error);
        setRates([]);
        return;
      }
      const sorted = [...result.quote.rates].sort((a, b) => a.price - b.price);
      setQuoteId(result.quote.quoteId);
      setExpiresAt(result.quote.expiresAt);
      setRates(sorted);
      setSelectedRateId(sorted[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function onBuy() {
    if (!quoteId || !selectedRateId) return;
    setBuying(true);
    setError(null);
    try {
      const result = await buyAction(quoteId, selectedRateId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBoughtId(result.shipment.id);
    } finally {
      setBuying(false);
    }
  }

  return (
    <form onSubmit={onQuote} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
        <AddressCard
          title="Origen"
          description="Quién envía · C.P. y colonia, como en las paqueterías MX"
          value={origin}
          prefix="origin"
          errors={fieldErrors}
          onChange={setOrigin}
        />
        <div className="hidden pt-16 lg:flex">
          <ArrowRight className="h-5 w-5 text-muted-foreground" aria-hidden />
        </div>
        <AddressCard
          title="Destino"
          description="Quién recibe · C.P. y colonia, como en las paqueterías MX"
          value={destination}
          prefix="destination"
          errors={fieldErrors}
          onChange={setDestination}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <CardTitle>Paquete</CardTitle>
          </div>
          <CardDescription>
            Peso en kg y medidas en cm. El valor declarado se usa para el seguro de la paquetería.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Field
            label="Contenido"
            htmlFor="content"
            className="lg:col-span-2"
            error={fieldError(fieldErrors, "packages.0.content")}
            hint="Ej. ropa, electrónicos, documentos"
          >
            <Input
              id="content"
              value={pkg.content}
              placeholder="Ropa"
              onChange={(e) => setPkg({ ...pkg, content: e.target.value })}
            />
          </Field>
          <Field label="Peso (kg)" htmlFor="weight" error={fieldError(fieldErrors, "packages.0.weightKg")}>
            <Input
              id="weight"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              placeholder="0.50"
              value={pkg.weightKg}
              onChange={(e) => setPkg({ ...pkg, weightKg: e.target.value })}
            />
          </Field>
          <Field label="Largo (cm)" htmlFor="length" error={fieldError(fieldErrors, "packages.0.lengthCm")}>
            <Input
              id="length"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="1"
              placeholder="30"
              value={pkg.lengthCm}
              onChange={(e) => setPkg({ ...pkg, lengthCm: e.target.value })}
            />
          </Field>
          <Field label="Ancho (cm)" htmlFor="width" error={fieldError(fieldErrors, "packages.0.widthCm")}>
            <Input
              id="width"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="1"
              placeholder="20"
              value={pkg.widthCm}
              onChange={(e) => setPkg({ ...pkg, widthCm: e.target.value })}
            />
          </Field>
          <Field label="Alto (cm)" htmlFor="height" error={fieldError(fieldErrors, "packages.0.heightCm")}>
            <Input
              id="height"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="1"
              placeholder="10"
              value={pkg.heightCm}
              onChange={(e) => setPkg({ ...pkg, heightCm: e.target.value })}
            />
          </Field>
          <Field
            label="Valor declarado (MXN)"
            htmlFor="value"
            className="sm:col-span-2 lg:col-span-2"
            error={fieldError(fieldErrors, "packages.0.declaredValueMxn")}
          >
            <Input
              id="value"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="450"
              value={pkg.declaredValueMxn}
              onChange={(e) => setPkg({ ...pkg, declaredValueMxn: e.target.value })}
            />
          </Field>
        </CardContent>
      </Card>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {boughtId ? (
        <p className="rounded-md border border-lima/40 bg-lima/15 px-3 py-2 text-sm text-navy">
          Guía comprada.{" "}
          <Link className="font-medium underline" href={`/portal/envios/${boughtId}`}>
            Ver rastreo y descargar PDF
          </Link>
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={loading || buying}>
          {loading ? "Cotizando…" : "Cotizar envío"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setOrigin(demoOrigin);
            setDestination(demoDestination);
            setPkg({
              content: "Ropa",
              weightKg: "0.5",
              lengthCm: "30",
              widthCm: "20",
              heightCm: "10",
              declaredValueMxn: "450",
            });
            setFieldErrors({});
            setError(null);
          }}
        >
          <Sparkles className="h-4 w-4" />
          Cargar ejemplo CDMX → MTY
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setOrigin(emptyAddress("CX"));
            setDestination(emptyAddress("NL"));
            setPkg({
              content: "",
              weightKg: "",
              lengthCm: "",
              widthCm: "",
              heightCm: "",
              declaredValueMxn: "",
            });
            setRates([]);
            setQuoteId(null);
            setSelectedRateId(null);
            setBoughtId(null);
            setFieldErrors({});
            setError(null);
          }}
        >
          Limpiar
        </Button>
      </div>

      {rates.length > 0 ? (
        <Card id="tarifas">
          <CardHeader>
            <CardTitle>Compara tarifas</CardTitle>
            <CardDescription>
              Precio final en MXN, de menor a mayor. Incluye comisión; el costo de Envia no se
              muestra.
              {expiresAt ? ` Vigente hasta las ${formatTimeMx(expiresAt)}.` : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {rates.map((rate) => {
                const selected = selectedRateId === rate.id;
                return (
                  <button
                    key={rate.id}
                    type="button"
                    disabled={Boolean(boughtId) || buying}
                    onClick={() => setSelectedRateId(rate.id)}
                    className={cn(
                      "flex w-full flex-col gap-3 rounded-xl border bg-background p-4 text-left transition-colors sm:flex-row sm:items-center sm:justify-between",
                      selected ? "border-lima ring-2 ring-lima/35" : "hover:border-navy/30",
                    )}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                          selected ? "border-navy bg-navy text-white" : "border-input",
                        )}
                      >
                        {selected ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{carrierLabel(rate.carrier)}</p>
                          {rate.id === cheapestId ? (
                            <Badge variant="success">Mejor precio</Badge>
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground">{rate.serviceName}</p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between gap-6 sm:items-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Entrega</p>
                        <p className="text-sm font-medium">{rate.deliveryEstimate ?? "Por confirmar"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Precio</p>
                        <p className="text-lg font-semibold tabular-nums text-navy">{formatMxn(rate.price)}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-3 rounded-lg bg-muted/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tarifa seleccionada</p>
                <p className="font-medium">
                  {selectedRate
                    ? `${carrierLabel(selectedRate.carrier)} · ${selectedRate.serviceName} · ${formatMxn(selectedRate.price)}`
                    : "Elige una tarifa"}
                </p>
              </div>
              <Button
                type="button"
                size="lg"
                disabled={!selectedRate || buying || Boolean(boughtId)}
                onClick={onBuy}
              >
                {buying ? "Comprando…" : "Comprar guía"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </form>
  );
}

function AddressCard({
  title,
  description,
  value,
  prefix,
  errors,
  onChange,
}: {
  title: string;
  description: string;
  value: AddressState;
  prefix: "origin" | "destination";
  errors: Record<string, string>;
  onChange: Dispatch<SetStateAction<AddressState>>;
}) {
  const [zipStatus, setZipStatus] = useState<ZipFieldStatus>("idle");
  const [suburbs, setSuburbs] = useState<string[]>([]);
  const [municipality, setMunicipality] = useState<string>("");
  const [coloniaFilter, setColoniaFilter] = useState("");

  useEffect(() => {
    const code = value.postalCode;
    if (!isCompletePostalCode(code)) {
      setZipStatus("idle");
      setSuburbs([]);
      setMunicipality("");
      setColoniaFilter("");
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setZipStatus("loading");

    void (async () => {
      try {
        const res = await fetch(`/api/geo/zip?code=${code}`, { signal: controller.signal });
        if (cancelled) return;
        if (res.status === 404) {
          setZipStatus("not_found");
          setSuburbs([]);
          setMunicipality("");
          onChange((prev) =>
            prev.postalCode === code ? { ...prev, city: "", district: "" } : prev,
          );
          return;
        }
        if (!res.ok) {
          setZipStatus("error");
          setSuburbs([]);
          return;
        }
        const data = (await res.json()) as ZipLookup;
        if (cancelled) return;
        const nextSuburbs = Array.isArray(data.suburbs) ? data.suburbs : [];
        setSuburbs(nextSuburbs);
        setMunicipality(data.municipality ?? "");
        setColoniaFilter("");
        setZipStatus("found");
        onChange((prev) =>
          prev.postalCode === code ? applyZipLookup(prev, { ...data, suburbs: nextSuburbs }) : prev,
        );
      } catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === "AbortError")) return;
        setZipStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [value.postalCode, onChange]);

  const zipMessage = zipFieldMessage(zipStatus, suburbs.length);
  const geoLocked = zipStatus === "found";
  const useColoniaSelect = zipStatus === "found" && suburbs.length > 0;
  const visibleSuburbs =
    coloniaFilter.trim().length === 0
      ? suburbs
      : suburbs.filter((name) => name.toLocaleLowerCase("es-MX").includes(coloniaFilter.trim().toLocaleLowerCase("es-MX")));
  const coloniaError = fieldError(errors, `${prefix}.district`);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{title}</CardTitle>
          <Badge variant="secondary">MX</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Field
          label="C.P."
          htmlFor={`${prefix}-zip`}
          hint={zipMessage.hint}
          error={zipMessage.error || fieldError(errors, `${prefix}.postalCode`)}
        >
          <div className="relative">
            <Input
              id={`${prefix}-zip`}
              inputMode="numeric"
              autoComplete="postal-code"
              value={value.postalCode}
              maxLength={5}
              placeholder="03920"
              aria-busy={zipStatus === "loading"}
              aria-invalid={zipStatus === "not_found" || zipStatus === "error" ? true : undefined}
              className="pr-9"
              onChange={(e) => {
                const postalCode = e.target.value.replace(/\D/g, "").slice(0, 5);
                onChange((prev) => {
                  if (prev.postalCode === postalCode) return prev;
                  if (postalCode.length < 5) {
                    return { ...prev, postalCode, city: "", district: "" };
                  }
                  return { ...prev, postalCode, district: "" };
                });
              }}
            />
            {zipStatus === "loading" ? (
              <Loader2
                className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground"
                aria-hidden
              />
            ) : null}
          </div>
        </Field>
        <Field
          label="Colonia"
          htmlFor={`${prefix}-district`}
          hint={
            useColoniaSelect
              ? suburbs.length === 1
                ? "Única colonia de este C.P."
                : "Elige la colonia"
              : "Se llena al consultar el C.P."
          }
          error={coloniaError}
        >
          {useColoniaSelect ? (
            <div className="space-y-2">
              {suburbs.length > 8 ? (
                <Input
                  id={`${prefix}-district-filter`}
                  value={coloniaFilter}
                  placeholder="Buscar colonia"
                  aria-label={`Filtrar colonias de ${title.toLowerCase()}`}
                  onChange={(e) => setColoniaFilter(e.target.value)}
                />
              ) : null}
              <NativeSelect
                id={`${prefix}-district`}
                value={value.district}
                onChange={(e) => onChange((prev) => ({ ...prev, district: e.target.value }))}
              >
                {suburbs.length > 1 ? <option value="">Selecciona una colonia</option> : null}
                {(visibleSuburbs.length > 0 ? visibleSuburbs : suburbs).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : (
            <Input
              id={`${prefix}-district`}
              value={value.district}
              placeholder="Colonia"
              disabled={zipStatus === "loading"}
              onChange={(e) => onChange((prev) => ({ ...prev, district: e.target.value }))}
            />
          )}
        </Field>
        <Field
          label="Ciudad"
          htmlFor={`${prefix}-city`}
          hint={
            geoLocked
              ? municipality
                ? `Municipio: ${municipality}`
                : "Completada desde el C.P."
              : undefined
          }
          error={fieldError(errors, `${prefix}.city`)}
        >
          <Input
            id={`${prefix}-city`}
            value={value.city}
            placeholder="Ciudad de México"
            readOnly={geoLocked}
            className={geoLocked ? "bg-muted/60" : undefined}
            onChange={(e) => onChange((prev) => ({ ...prev, city: e.target.value }))}
          />
        </Field>
        <Field label="Estado" htmlFor={`${prefix}-state`} error={fieldError(errors, `${prefix}.state`)}>
          <NativeSelect
            id={`${prefix}-state`}
            value={value.state}
            disabled={geoLocked}
            onChange={(e) => onChange((prev) => ({ ...prev, state: e.target.value }))}
          >
            {MX_STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.code} — {state.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Calle" htmlFor={`${prefix}-street`} error={fieldError(errors, `${prefix}.street`)}>
          <Input
            id={`${prefix}-street`}
            value={value.street}
            onChange={(e) => onChange((prev) => ({ ...prev, street: e.target.value }))}
          />
        </Field>
        <Field label="Número" htmlFor={`${prefix}-number`}>
          <Input
            id={`${prefix}-number`}
            value={value.number}
            onChange={(e) => onChange((prev) => ({ ...prev, number: e.target.value }))}
          />
        </Field>
        <Field
          label="Nombre"
          htmlFor={`${prefix}-name`}
          className="sm:col-span-2"
          error={fieldError(errors, `${prefix}.name`)}
        >
          <Input
            id={`${prefix}-name`}
            value={value.name}
            placeholder="Nombre completo"
            onChange={(e) => onChange((prev) => ({ ...prev, name: e.target.value }))}
          />
        </Field>
        <Field label="Empresa" htmlFor={`${prefix}-company`}>
          <Input
            id={`${prefix}-company`}
            value={value.company}
            onChange={(e) => onChange((prev) => ({ ...prev, company: e.target.value }))}
          />
        </Field>
        <Field
          label="Teléfono"
          htmlFor={`${prefix}-phone`}
          hint="10 dígitos"
          error={fieldError(errors, `${prefix}.phone`)}
        >
          <Input
            id={`${prefix}-phone`}
            inputMode="tel"
            value={value.phone}
            placeholder="5551234567"
            onChange={(e) => onChange((prev) => ({ ...prev, phone: e.target.value }))}
          />
        </Field>
        <Field label="Correo" htmlFor={`${prefix}-email`} className="sm:col-span-2" error={fieldError(errors, `${prefix}.email`)}>
          <Input
            id={`${prefix}-email`}
            type="email"
            value={value.email}
            onChange={(e) => onChange((prev) => ({ ...prev, email: e.target.value }))}
          />
        </Field>
        <Field label="Referencia" htmlFor={`${prefix}-ref`} className="sm:col-span-2">
          <Input
            id={`${prefix}-ref`}
            value={value.reference}
            placeholder="Entre calles, color de fachada…"
            onChange={(e) => onChange((prev) => ({ ...prev, reference: e.target.value }))}
          />
        </Field>
      </CardContent>
    </Card>
  );
}
