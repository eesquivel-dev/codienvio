"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { Suspense } from "react";

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
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <Package className="h-5 w-5 text-primary" />
          CodiEnvio
        </div>
        <CardTitle>Iniciar sesión</CardTitle>
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
    <main className="flex min-h-screen items-center justify-center px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
