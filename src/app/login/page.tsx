"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Truck } from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("cliente@demo.mx");
  const [password, setPassword] = useState("Cliente1234!");
  const [error, setError] = useState<string | null>(
    params.get("error") ? "Correo o contraseña incorrectos" : null,
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (!result?.ok) {
      setError("Correo o contraseña incorrectos");
      return;
    }
    const sessionRes = await fetch("/api/auth/session");
    const session = (await sessionRes.json()) as { user?: { role?: string } };
    router.replace(session.user?.role === "ADMIN" ? "/admin" : "/portal");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md border-0 shadow-lg sm:border">
      <CardHeader className="space-y-3">
        <div className="sm:hidden">
          <BrandLockup subtitle="Guías de envío para México" />
        </div>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>
          Entra con tu correo de cliente para cotizar, o con una cuenta admin para operar CodiEnvio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Correo" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Contraseña" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Cuentas demo: <code>admin@codienvio.mx</code> / Admin1234! · <code>cliente@demo.mx</code>{" "}
            / Cliente1234!
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between bg-primary px-10 py-12 text-primary-foreground lg:flex">
        <BrandLockup tone="inverse" subtitle="Guías de envío para México" />
        <div className="max-w-md space-y-6">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-foreground/70">
            México · Envia.com
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">Cotiza y compra guías en minutos</h1>
          <p className="text-base text-primary-foreground/80">
            Compara paqueterías, elige el mejor precio en MXN y descarga el PDF. Tus clientes nunca
            ven el costo negociado con Envia.
          </p>
          <ul className="space-y-3 text-sm text-primary-foreground/85">
            <li className="flex items-start gap-2">
              <Truck className="mt-0.5 h-4 w-4 shrink-0" />
              Estafeta, DHL, FedEx, UPS, Paquetexpress y Redpack
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Precio final con comisión. Sin exponer el costo del proveedor.
            </li>
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">CodiEnvio · Revendedor de guías domésticas</p>
      </section>
      <section className="flex items-center justify-center bg-background px-4 py-10">
        <Suspense>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
