"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
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
    <Card className="w-full max-w-md border-0">
      <CardHeader>
        <div className="mb-3 sm:hidden">
          <BrandMark />
        </div>
        <CardTitle className="text-2xl font-bold">Iniciar sesión</CardTitle>
        <CardDescription>Usa tu correo de cliente o administrador.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Correo" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Contraseña" htmlFor="password">
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Demo: <code>admin@codienvio.mx</code> / Admin1234! · <code>cliente@demo.mx</code> /
            Cliente1234!
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col bg-navy">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-navy-claro/50" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-navy-claro/35" />
      </div>
      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <BrandMark variant="on-dark" />
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-lima">
          Portal de envíos
        </p>
      </header>
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
      <footer className="relative z-10 flex items-center justify-between border-t border-white/15 px-6 py-4 text-[10px] uppercase tracking-[0.14em] text-white/45 sm:px-10">
        <span>CTI Group · CodiEnvio</span>
        <span>Identidad de marca v1.0</span>
      </footer>
    </main>
  );
}
