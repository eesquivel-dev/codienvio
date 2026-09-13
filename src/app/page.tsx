import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Gauge, Package, Search, ShieldCheck, Wallet, Zap } from "lucide-react";
import { auth } from "@/lib/auth";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clientCopy, landingBenefits } from "@/lib/brand-copy";

export default async function HomePage() {
  const session = await auth();
  const href = session?.user?.role === "ADMIN" ? "/admin" : session ? "/portal" : "/login";

  return (
    <main className="min-h-screen bg-papel">
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-navy-claro/40" />
          <div className="absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-lima/10" />
        </div>
        <div className="relative mx-auto flex max-w-5xl flex-col gap-10 px-6 py-14 sm:py-20">
          <div className="flex items-center justify-between gap-4">
            <BrandMark variant="on-dark" size="lg" />
            <p className="type-overline hidden text-lima sm:block">{clientCopy.landingEyebrow}</p>
          </div>
          <div className="max-w-2xl space-y-5">
            <p className="type-overline text-lima sm:hidden">{clientCopy.landingEyebrow}</p>
            <h1 className="type-display text-white">{clientCopy.landingTitle}</h1>
            <div className="h-1 w-12 bg-lima" aria-hidden />
            <p className="type-body text-lg text-white/80">{clientCopy.landingLead}</p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button asChild size="lg">
                <Link href={href}>
                  {session ? clientCopy.landingCtaSession : clientCopy.landingCta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="inverse" size="lg">
                <Link href="/docs">{clientCopy.landingDocs}</Link>
              </Button>
            </div>
          </div>
          <dl className="grid gap-3 sm:grid-cols-3">
            <HeroStat icon={<Zap className="h-4 w-4" />} label="Rapidez" value="Cotiza y compra en minutos" />
            <HeroStat icon={<ShieldCheck className="h-4 w-4" />} label="Confianza" value="Precios claros en MXN" />
            <HeroStat icon={<Gauge className="h-4 w-4" />} label="Control" value="Saldo y rastreo juntos" />
          </dl>
        </div>
        <div className="h-0.5 bg-lima" aria-hidden />
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 py-12 md:grid-cols-3">
        {landingBenefits.map((item, index) => {
          const Icon = [Search, Package, Wallet][index] ?? Package;
          return (
            <Card key={item.title}>
              <CardHeader>
                <Icon className="h-5 w-5 text-navy-claro" />
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{item.body}</CardContent>
            </Card>
          );
        })}
      </section>
    </main>
  );
}

function HeroStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      <dt className="flex items-center gap-2 type-overline text-lima">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-white/85">{value}</dd>
    </div>
  );
}
