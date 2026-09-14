import type { ReactNode } from "react";
import Link from "next/link";
import {
  BadgePercent,
  PackageCheck,
  PackageX,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { getOperatorDashboard } from "@/lib/reports-data";
import { BreakdownBars, DaySparkBars } from "@/components/breakdown-bars";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { carrierLabel, formatDateTimeMx } from "@/lib/format";
import { formatMxn } from "@/lib/money";
import {
  REPORT_PERIODS,
  parseReportPeriod,
  reportFactKindLabel,
  type ReportFact,
  type ReportPeriodPreset,
} from "@/lib/reports";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const period = parseReportPeriod(params.periodo);
  const stats = await getOperatorDashboard(period);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Operación de Código Envío: ventas, margen, recargas y actividad reciente. Costos de paquetería y comisiones solo se ven aquí."
        actions={
          <>
            <Button asChild>
              <Link href="/admin/reportes">Abrir reportes</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/configuracion">Configuración</Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {REPORT_PERIODS.map((item) => (
          <PeriodChip key={item.value} value={item.value} label={item.label} active={period === item.value} />
        ))}
        {stats.range.from ? (
          <p className="text-xs text-muted-foreground">
            {stats.range.from} a {stats.range.to}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Todo el historial</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Store className="h-4 w-4" />}
          label="Ventas"
          value={String(stats.kpis.salesCount.current)}
          hint={`${stats.totals.purchasedCount} guías compradas`}
          change={stats.kpis.salesCount.change}
        />
        <KpiCard
          icon={<BadgePercent className="h-4 w-4" />}
          label="Margen"
          value={formatMxn(stats.kpis.fee.current)}
          hint="Comisión del periodo"
          change={stats.kpis.fee.change}
        />
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          label="Ingreso cliente"
          value={formatMxn(stats.kpis.clientPrice.current)}
          hint={`Costo Envía ${formatMxn(stats.kpis.providerCost.current)}`}
          change={stats.kpis.clientPrice.change}
        />
        <KpiCard
          icon={<PackageCheck className="h-4 w-4" />}
          label="Recargas"
          value={formatMxn(stats.kpis.topUp.current)}
          hint={`${stats.totals.topUpCount} cargas de saldo`}
          change={stats.kpis.topUp.change}
        />
        <KpiCard
          icon={<PackageX className="h-4 w-4" />}
          label="Envíos fallidos"
          value={String(stats.kpis.failedCount.current)}
          hint={stats.totals.shipmentCount ? `${stats.totals.shipmentCount} envíos en total` : "Sin envíos"}
          change={stats.kpis.failedCount.change}
        />
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Clientes activos"
          value={String(stats.snapshot.activeClients)}
          hint={`${stats.snapshot.clientCount} en catálogo`}
        />
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          label="Saldo en wallets"
          value={formatMxn(stats.snapshot.walletTotal)}
          hint="Saldo prepagado actual"
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[0.8125rem] font-medium tracking-[-0.011em] text-muted-foreground">
              Ventas por día
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byDay.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin ventas en este periodo.</p>
            ) : (
              <>
                <DaySparkBars rows={stats.byDay} />
                <p className="type-caption mt-2 text-muted-foreground">Precio al cliente, últimos días del periodo</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Por cliente</CardTitle>
            <CardDescription>Ingreso (precio al cliente) en el periodo seleccionado.</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownBars rows={stats.byClient} empty="Aún no hay ventas ni recargas en este periodo." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Por paquetería</CardTitle>
            <CardDescription>Guías compradas agrupadas por carrier.</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownBars rows={stats.byCarrier} empty="Aún no hay envíos con paquetería en este periodo." />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Actividad reciente</CardTitle>
            <CardDescription>Ventas, recargas, ajustes y fallos del periodo.</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/envios">Ver envíos</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay movimiento en este periodo. Compra una guía desde el portal demo (o activa modo
              simulado) o recarga saldo para ver actividad aquí.
            </p>
          ) : (
            stats.recent.map((item) => <ActivityRow key={item.id} item={item} />)
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CatalogLink href="/admin/reportes" title="Reportes" hint="Ventas, recargas, margen y CSV" />
        <CatalogLink href="/admin/clientes" title="Clientes" hint="Cuentas, comisiones y saldo" />
        <CatalogLink href="/admin/facturacion" title="Facturación" hint="Movimientos y estado de cuenta" />
        <CatalogLink href="/admin/integraciones" title="Integraciones" hint="Envía, API keys y Mercado Pago" />
      </div>
    </div>
  );
}

function PeriodChip({
  value,
  label,
  active,
}: {
  value: ReportPeriodPreset;
  label: string;
  active: boolean;
}) {
  const href = value === "month" ? "/admin" : `/admin?periodo=${value}`;
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-navy px-3 py-1 text-xs font-semibold text-white"
          : "rounded-full border border-navy/15 bg-white px-3 py-1 text-xs font-medium text-navy hover:border-lima hover:bg-lima/15"
      }
    >
      {label}
    </Link>
  );
}

function CatalogLink({ href, title, hint }: { href: string; title: string; hint: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-navy/10 bg-white px-4 py-3 transition-colors hover:border-lima hover:bg-lima/10"
    >
      <p className="font-semibold text-navy">{title}</p>
      <p className="type-caption text-muted-foreground">{hint}</p>
    </Link>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  change,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  change?: number | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-[0.8125rem] font-medium tracking-[-0.011em] text-muted-foreground">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-[-0.03em] tabular-nums text-navy">{value}</p>
        <p className="type-caption mt-1 text-muted-foreground">{hint}</p>
        {change != null ? (
          <p className={`type-caption mt-1 ${change >= 0 ? "text-navy" : "text-destructive"}`}>
            {change > 0 ? "+" : ""}
            {change}% vs periodo anterior
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ActivityRow({ item }: { item: ReportFact }) {
  const isSale = item.kind === "SALE";
  const isFail = item.kind === "FAILED_SHIPMENT";
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{item.clientName}</p>
          <Badge variant={isSale ? "default" : item.kind === "TOP_UP" ? "success" : isFail ? "destructive" : "outline"}>
            {reportFactKindLabel(item.kind)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {item.carrier ? `${carrierLabel(item.carrier)} · ` : ""}
          {item.trackingNumber ?? item.note ?? "—"} · {formatDateTimeMx(item.createdAt)}
        </p>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {isSale ? (
          <>
            <span className="tabular-nums text-muted-foreground">margen {formatMxn(item.feeAmount ?? 0)}</span>
            <span className="font-semibold tabular-nums text-navy">{formatMxn(item.clientPrice ?? 0)}</span>
            <StatusBadge status="PURCHASED" />
          </>
        ) : isFail ? (
          <StatusBadge status="FAILED" />
        ) : (
          <span className="font-semibold tabular-nums text-navy">{formatMxn(item.walletAmount ?? 0)}</span>
        )}
      </div>
    </div>
  );
}
