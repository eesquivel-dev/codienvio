import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookUser,
  History,
  Package,
  Search,
  Wallet,
} from "lucide-react";
import { QuoteForm } from "@/components/quote-form";
import { AreaChart, DonutChart } from "@/components/charts";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireClient } from "@/lib/auth";
import { clientCopy } from "@/lib/brand-copy";
import { portalEnviosHref } from "@/lib/dashboard";
import { formatDateTimeMx } from "@/lib/format";
import { formatMxn } from "@/lib/money";
import { getClientDashboard } from "@/lib/portal-dashboard";

export default async function PortalPage() {
  const session = await requireClient();
  const dashboard = await getClientDashboard(session.user.clientId!, session.user.name);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-lg border border-navy/10 bg-card p-6 shadow-sm sm:p-8">
        <p className="type-overline text-lima">{clientCopy.portalEyebrow}</p>
        <h1 className="type-display-sm mt-2 text-navy">
          Hola{dashboard.greetingName ? `, ${dashboard.greetingName}` : ""}
        </h1>
        <div className="mt-2 h-1 w-10 bg-lima" aria-hidden />
        <p className="type-body mt-3 max-w-2xl text-muted-foreground">{clientCopy.portalLead}</p>
        {dashboard.lowBalance ? (
          <p className="mt-4 rounded-md border border-lima/40 bg-lima/15 px-3 py-2 text-sm text-navy">
            Tu saldo está por debajo de {formatMxn(dashboard.lowBalanceThreshold)}. Recárgalo para
            comprar la siguiente guía sin interrupciones.
          </p>
        ) : null}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href="#cotizar" title="Cotizar envío" hint="Compara y compra tu guía" icon={<Package className="h-4 w-4" />} primary />
          <QuickAction href="/portal/libreta" title="Libreta" hint="Direcciones y paquetes" icon={<BookUser className="h-4 w-4" />} />
          <QuickAction href="/portal/saldo" title="Recargar saldo" hint={formatMxn(dashboard.balanceMxn)} icon={<Wallet className="h-4 w-4" />} />
          <QuickAction href="/rastreo" title="Rastrear guía" hint="Consulta el estado del envío" icon={<Search className="h-4 w-4" />} />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          label="Saldo"
          value={formatMxn(dashboard.balanceMxn)}
          hint="Disponible para comprar guías"
          href="/portal/saldo"
        />
        <KpiCard
          icon={<Package className="h-4 w-4" />}
          label="Guías compradas"
          value={String(dashboard.purchasedCount)}
          hint={dashboard.failedCount ? `${dashboard.failedCount} fallidas` : "Historial de envíos"}
          href={portalEnviosHref({ status: "PURCHASED" })}
        />
        <KpiCard
          icon={<History className="h-4 w-4" />}
          label="Este mes"
          value={formatMxn(dashboard.monthSpend)}
          hint={`${dashboard.monthPurchasedCount} guías · ${dashboard.range.from} a ${dashboard.range.to}`}
          href={portalEnviosHref({
            status: "PURCHASED",
            from: dashboard.range.from,
            to: dashboard.range.to,
          })}
        />
        <KpiCard
          icon={<Search className="h-4 w-4" />}
          label="Último envío"
          value={dashboard.recent[0] ? dashboard.recent[0].carrierLabel : "Sin envíos"}
          hint={
            dashboard.recent[0]
              ? `${dashboard.recent[0].trackingNumber ?? dashboard.recent[0].id} · ${formatDateTimeMx(dashboard.recent[0].createdAt)}`
              : "Cotiza tu primera guía"
          }
          href={dashboard.recent[0] ? `/portal/envios/${dashboard.recent[0].id}` : "/portal#cotizar"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Envíos de este mes</CardTitle>
            <CardDescription>Guías compradas por día en zona Mexico City.</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChart
              points={dashboard.byDay.map((row) => ({ label: row.key, value: row.count }))}
              empty="Aún no compras guías este mes."
              valueLabel={(value) => `${value} guías`}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Por paquetería</CardTitle>
            <CardDescription>Tus guías compradas.</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              slices={dashboard.byCarrier.map((row) => ({
                key: row.key,
                label: row.label,
                value: row.count,
              }))}
              empty="Cuando compres una guía, aquí verás el desglose."
              valueLabel={(value) => `${value} guías`}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Envíos recientes</CardTitle>
            <CardDescription>Las últimas guías compradas.</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/portal/envios">Ver historial</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {dashboard.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay envíos. Cotiza origen, destino y medidas para comparar paqueterías.
            </p>
          ) : (
            dashboard.recent.map((item) => (
              <Link
                key={item.id}
                href={`/portal/envios/${item.id}`}
                className="flex flex-col gap-2 rounded-lg border border-navy/10 p-3 transition-colors hover:border-lima hover:bg-lima/10 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-navy">
                    {item.trackingNumber ?? item.id} · {item.carrierLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTimeMx(item.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-semibold tabular-nums">{formatMxn(item.price)}</span>
                  <StatusBadge status={item.status} />
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <section id="cotizar" className="scroll-mt-24 space-y-4">
        <div>
          <h2 className="type-title text-navy">Cotizar envío</h2>
          <div className="mt-2 h-1 w-10 bg-lima" aria-hidden />
          <p className="type-body mt-2 text-muted-foreground">
            Completa origen, destino y medidas. Reutiliza tu libreta o, si solo quieres probar, el
            ejemplo CDMX → MTY.
          </p>
        </div>
        <QuoteForm
          balanceMxn={dashboard.balanceMxn}
          savedAddresses={dashboard.savedAddresses}
          savedPackages={dashboard.savedPackages}
        />
      </section>
    </div>
  );
}

function QuickAction({
  href,
  title,
  hint,
  icon,
  primary,
}: {
  href: string;
  title: string;
  hint: string;
  icon: ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "flex items-center justify-between gap-3 rounded-lg bg-lima px-4 py-3 text-navy transition-colors hover:bg-[color:var(--lima-hover)]"
          : "flex items-center justify-between gap-3 rounded-lg border border-navy/10 bg-white px-4 py-3 transition-colors hover:border-lima hover:bg-lima/10"
      }
    >
      <span>
        <span className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </span>
        <span className="type-caption mt-0.5 block text-navy/70">{hint}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0" />
    </Link>
  );
}
