"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { clientCopy, loginBenefits } from "@/lib/brand-copy";

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
    <Card className="w-full max-w-md border-0 shadow-lg">
      <CardHeader>
        <div className="mb-3 lg:hidden">
          <BrandMark />
        </div>
        <CardTitle className="type-title">{clientCopy.loginTitle}</CardTitle>
        <CardDescription className="type-body mt-1">{clientCopy.loginLead}</CardDescription>
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
          <p className="type-caption leading-relaxed text-muted-foreground">
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
    <main className="grid min-h-screen bg-papel lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-navy text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-navy-claro/45" />
          <div className="absolute -bottom-24 -left-10 h-80 w-80 rounded-full bg-lima/10" />
        </div>
        <header className="relative z-10 px-10 py-8">
          <BrandMark variant="on-dark" size="lg" />
        </header>
        <div className="relative z-10 space-y-5 px-10 pb-16">
          <p className="type-overline text-lima">{clientCopy.loginEyebrow}</p>
          <h1 className="type-display-sm text-white">{clientCopy.loginPanelTitle}</h1>
          <div className="h-1 w-12 bg-lima" aria-hidden />
          <p className="type-body max-w-md text-lg text-white/75">{clientCopy.loginPanelLead}</p>
          <ul className="space-y-2.5 pt-2">
            {loginBenefits.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-white/85">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lima text-navy">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <footer className="relative z-10 border-t border-white/15 px-10 py-4">
          <p className="type-overline text-white/45">{clientCopy.productName}</p>
        </footer>
      </section>

      <section className="relative flex min-h-screen flex-col bg-papel">
        <header className="flex items-center justify-between px-6 py-6 lg:hidden">
          <BrandMark />
          <p className="type-overline text-navy">{clientCopy.loginEyebrow}</p>
        </header>
        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
