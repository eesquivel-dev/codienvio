"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { buyAction, quoteAction } from "@/app/portal/actions";
import { KeyFigure } from "@/components/key-figure";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MX_STATES } from "@/lib/mexico";
import { formatMxn } from "@/lib/money";

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

const emptyAddress = (): AddressState => ({
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
});

const demoOrigin: AddressState = {
  name: "Edgar Esquivel",
  company: "CodiEnvio Demo",
  email: "edgar@codienvio.mx",
  phone: "5551234567",
  street: "Av. Insurgentes Sur",
  number: "1647",
  district: "San José Insurgentes",
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

export function QuoteForm() {
  const [origin, setOrigin] = useState<AddressState>(demoOrigin);
  const [destination, setDestination] = useState<AddressState>(demoDestination);
  const [pkg, setPkg] = useState({
    content: "Ropa",
    weightKg: "0.5",
    lengthCm: "30",
    widthCm: "20",
    heightCm: "10",
    declaredValueMxn: "450",
  });
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [rates, setRates] = useState<Rate[]>([]);
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

  async function fillFromZip(
    which: "origin" | "destination",
    postalCode: string,
    current: AddressState,
    setter: (next: AddressState) => void,
  ) {
    setter({ ...current, postalCode });
    if (!/^\d{5}$/.test(postalCode)) return;
    try {
      const res = await fetch(`/api/geo/zip?code=${postalCode}`);
      if (!res.ok) return;
      const data = (await res.json()) as { city?: string; state?: string };
      setter({
        ...current,
        postalCode,
        city: data.city || current.city,
        state: data.state || current.state,
      });
    } catch {
      /* ignore lookup failures */
    }
  }

  async function onQuote(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setBoughtId(null);
    try {
      const result = await quoteAction(payload);
      if (!result.ok) {
        setError(result.error);
        setRates([]);
        return;
      }
      setQuoteId(result.quote.quoteId);
      setExpiresAt(result.quote.expiresAt);
      setRates(result.quote.rates);
    } finally {
      setLoading(false);
    }
  }

  async function onBuy(rateId: string) {
    if (!quoteId) return;
    setBuying(rateId);
    setError(null);
    try {
      const result = await buyAction(quoteId, rateId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBoughtId(result.shipment.id);
    } finally {
      setBuying(null);
    }
  }

  return (
    <form onSubmit={onQuote} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <AddressCard
          title="Origen"
          description="Quién envía el paquete"
          value={origin}
          prefix="origin"
          onChange={setOrigin}
          onZip={(code) => fillFromZip("origin", code, origin, setOrigin)}
        />
        <AddressCard
          title="Destino"
          description="Quién recibe el paquete"
          value={destination}
          prefix="destination"
          onChange={setDestination}
          onZip={(code) => fillFromZip("destination", code, destination, setDestination)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Paquete</CardTitle>
          <CardDescription>Peso en kg y medidas en cm. Solo envíos domésticos MX.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Contenido" htmlFor="content" className="lg:col-span-2">
            <Input
              id="content"
              value={pkg.content}
              onChange={(e) => setPkg({ ...pkg, content: e.target.value })}
              required
            />
          </Field>
          <Field label="Peso (kg)" htmlFor="weight">
            <Input
              id="weight"
              type="number"
              step="0.01"
              min="0.01"
              value={pkg.weightKg}
              onChange={(e) => setPkg({ ...pkg, weightKg: e.target.value })}
              required
            />
          </Field>
          <Field label="Largo (cm)" htmlFor="length">
            <Input
              id="length"
              type="number"
              step="0.1"
              min="1"
              value={pkg.lengthCm}
              onChange={(e) => setPkg({ ...pkg, lengthCm: e.target.value })}
              required
            />
          </Field>
          <Field label="Ancho (cm)" htmlFor="width">
            <Input
              id="width"
              type="number"
              step="0.1"
              min="1"
              value={pkg.widthCm}
              onChange={(e) => setPkg({ ...pkg, widthCm: e.target.value })}
              required
            />
          </Field>
          <Field label="Alto (cm)" htmlFor="height">
            <Input
              id="height"
              type="number"
              step="0.1"
              min="1"
              value={pkg.heightCm}
              onChange={(e) => setPkg({ ...pkg, heightCm: e.target.value })}
              required
            />
          </Field>
          <Field label="Valor declarado (MXN)" htmlFor="value" className="sm:col-span-2 lg:col-span-2">
            <Input
              id="value"
              type="number"
              step="0.01"
              min="0"
              value={pkg.declaredValueMxn}
              onChange={(e) => setPkg({ ...pkg, declaredValueMxn: e.target.value })}
              required
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
        <p className="rounded-md border border-lima bg-lima/15 px-3 py-2 text-sm text-navy">
          Guía comprada.{" "}
          <Link className="font-medium underline" href={`/portal/envios/${boughtId}`}>
            Ver rastreo y PDF
          </Link>
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Cotizando…" : "Cotizar envío"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setOrigin(emptyAddress());
            setDestination({ ...emptyAddress(), state: "NL" });
          }}
        >
          Limpiar
        </Button>
      </div>

      {rates.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Tarifas</CardTitle>
            <CardDescription>
              Precio final en MXN (incluye comisión). El costo de Envia no se muestra.
              {expiresAt ? ` Vigente hasta ${new Date(expiresAt).toLocaleTimeString("es-MX")}.` : null}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paquetería</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Entrega</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium capitalize">{rate.carrier}</TableCell>
                    <TableCell>{rate.serviceName}</TableCell>
                    <TableCell>{rate.deliveryEstimate ?? "—"}</TableCell>
                    <TableCell>
                      <KeyFigure>{formatMxn(rate.price)}</KeyFigure>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        disabled={Boolean(buying) || Boolean(boughtId)}
                        onClick={() => onBuy(rate.id)}
                      >
                        {buying === rate.id ? "Comprando…" : "Comprar guía"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
  onChange,
  onZip,
}: {
  title: string;
  description: string;
  value: AddressState;
  prefix: string;
  onChange: (next: AddressState) => void;
  onZip: (code: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Badge variant="secondary">MX</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre" htmlFor={`${prefix}-name`} className="sm:col-span-2">
          <Input
            id={`${prefix}-name`}
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            required
          />
        </Field>
        <Field label="Empresa" htmlFor={`${prefix}-company`}>
          <Input
            id={`${prefix}-company`}
            value={value.company}
            onChange={(e) => onChange({ ...value, company: e.target.value })}
          />
        </Field>
        <Field label="Teléfono" htmlFor={`${prefix}-phone`}>
          <Input
            id={`${prefix}-phone`}
            value={value.phone}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
            required
          />
        </Field>
        <Field label="Correo" htmlFor={`${prefix}-email`} className="sm:col-span-2">
          <Input
            id={`${prefix}-email`}
            type="email"
            value={value.email}
            onChange={(e) => onChange({ ...value, email: e.target.value })}
          />
        </Field>
        <Field label="Calle" htmlFor={`${prefix}-street`}>
          <Input
            id={`${prefix}-street`}
            value={value.street}
            onChange={(e) => onChange({ ...value, street: e.target.value })}
            required
          />
        </Field>
        <Field label="Número" htmlFor={`${prefix}-number`}>
          <Input
            id={`${prefix}-number`}
            value={value.number}
            onChange={(e) => onChange({ ...value, number: e.target.value })}
          />
        </Field>
        <Field label="Colonia" htmlFor={`${prefix}-district`}>
          <Input
            id={`${prefix}-district`}
            value={value.district}
            onChange={(e) => onChange({ ...value, district: e.target.value })}
          />
        </Field>
        <Field label="C.P." htmlFor={`${prefix}-zip`}>
          <Input
            id={`${prefix}-zip`}
            value={value.postalCode}
            maxLength={5}
            onChange={(e) => onZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            required
          />
        </Field>
        <Field label="Ciudad" htmlFor={`${prefix}-city`}>
          <Input
            id={`${prefix}-city`}
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            required
          />
        </Field>
        <Field label="Estado" htmlFor={`${prefix}-state`}>
          <select
            id={`${prefix}-state`}
            className="flex h-9 w-full rounded-md border border-input bg-white px-3 text-sm text-navy shadow-sm"
            value={value.state}
            onChange={(e) => onChange({ ...value, state: e.target.value })}
          >
            {MX_STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.code} — {state.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Referencia" htmlFor={`${prefix}-ref`} className="sm:col-span-2">
          <Input
            id={`${prefix}-ref`}
            value={value.reference}
            onChange={(e) => onChange({ ...value, reference: e.target.value })}
          />
        </Field>
      </CardContent>
    </Card>
  );
}
