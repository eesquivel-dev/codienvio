import Link from "next/link";
import {
  BadgePercent,
  PackageCheck,
  PackageX,
  Store,
  Users,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { getOperatorDashboard } from "@/lib/reports-data";
import { AreaChart, DonutChart, DualMetricChart } from "@/components/charts";
import { BreakdownBars } from "@/components/breakdown-bars";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import {
  adminClientesHref,
  adminEnviosHref,
  adminFacturacionHref,
  adminReportesHref,
  LOW_BALANCE_MXN,
} from "@/lib/dashboard";
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
  const range = { from: stats.range.from, to: stats.range.to };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Operación de Código Envío: toca un indicador para ver el detalle filtrado. Costos de paquetería y comisiones solo se ven aquí."
        actions={
          <Button asChild>
            <Link href={adminReportesHref(range)}>Abrir reportes</Link>
          </Button>
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
          label="Envíos comprados"
          value={String(stats.kpis.salesCount.current)}
          hint={`${formatMxn(stats.kpis.clientPrice.current)} al cliente`}
          change={stats.kpis.salesCount.change}
          href={adminEnviosHref({ status: "PURCHASED", ...range })}
        />
        <KpiCard
          icon={<BadgePercent className="h-4 w-4" />}
          label="Margen"
          value={formatMxn(stats.kpis.fee.current)}
          hint="Comisión del periodo"
          change={stats.kpis.fee.change}
          href={adminReportesHref({ kind: "SALE", ...range })}
        />
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          label="Ingreso cliente"
          value={formatMxn(stats.kpis.clientPrice.current)}
          hint={`Costo Envía ${formatMxn(stats.kpis.providerCost.current)}`}
          change={stats.kpis.clientPrice.change}
          href={adminReportesHref({ kind: "SALE", ...range })}
        />
        <KpiCard
          icon={<PackageCheck className="h-4 w-4" />}
          label="Recargas"
          value={formatMxn(stats.kpis.topUp.current)}
          hint={`${stats.totals.topUpCount} cargas de saldo`}
          change={stats.kpis.topUp.change}
          href={adminFacturacionHref({ kind: "TOP_UP", ...range })}
        />
        <KpiCard
          icon={<PackageX className="h-4 w-4" />}
          label="Envíos fallidos"
          value={String(stats.kpis.failedCount.current)}
          hint={stats.totals.shipmentCount ? `${stats.totals.shipmentCount} envíos en total` : "Sin envíos"}
          change={stats.kpis.failedCount.change}
          href={adminEnviosHref({ status: "FAILED", ...range })}
        />
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Clientes activos"
          value={String(stats.snapshot.activeClients)}
          hint={`${stats.snapshot.clientCount} en catálogo`}
          href={adminClientesHref("active")}
        />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Saldo bajo"
          value={String(stats.snapshot.lowBalanceClients)}
          hint={`Activos con menos de ${formatMxn(LOW_BALANCE_MXN)}`}
          href={adminClientesHref("low")}
        />
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          label="Saldo en wallets"
          value={formatMxn(stats.snapshot.walletTotal)}
          hint="Saldo prepagado actual"
          href={adminClientesHref()}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Envíos por día</CardTitle>
            <CardDescription>Guías compradas y fallidas en el periodo.</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChart
              points={stats.byDaySeries.map((row) => ({ label: row.key, value: row.shipmentCount }))}
              empty="Sin envíos en este periodo."
              valueLabel={(value) => `${value} envíos`}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Por paquetería</CardTitle>
            <CardDescription>Guías compradas.</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              slices={stats.byCarrier.map((row) => ({
                key: row.key,
                label: row.label,
                value: row.salesCount,
              }))}
              empty="Aún no hay envíos con paquetería en este periodo."
              valueLabel={(value) => `${value} guías`}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ventas y margen</CardTitle>
          <CardDescription>Precio al cliente frente a comisión, por día.</CardDescription>
        </CardHeader>
        <CardContent>
          <DualMetricChart
            points={stats.byDaySeries.map((row) => ({
              label: row.key,
              primary: row.clientPrice,
              secondary: row.fee,
            }))}
            empty="Sin ventas en este periodo."
            primaryLabel="Ingreso cliente"
            secondaryLabel="Margen"
            formatPrimary={formatMxn}
            formatSecondary={formatMxn}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Por cliente</CardTitle>
            <CardDescription>Ingreso (precio al cliente) en el periodo seleccionado.</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownBars
              rows={stats.byClient}
              empty="Aún no hay ventas ni recargas en este periodo."
              hrefFor={(row) => adminReportesHref({ clientId: row.key, ...range })}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Detalle por paquetería</CardTitle>
            <CardDescription>Abre los envíos de ese carrier.</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownBars
              rows={stats.byCarrier}
              empty="Aún no hay envíos con paquetería en este periodo."
              hrefFor={(row) => adminEnviosHref({ carrier: row.key, status: "PURCHASED", ...range })}
            />
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
            <Link href={adminEnviosHref(range)}>Ver envíos</Link>
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

function ActivityRow({ item }: { item: ReportFact }) {
  const isSale = item.kind === "SALE";
  const isFail = item.kind === "FAILED_SHIPMENT";
  const href = isFail || isSale
    ? adminEnviosHref({ status: isFail ? "FAILED" : "PURCHASED", clientId: item.clientId })
    : adminFacturacionHref({ kind: item.kind === "TOP_UP" ? "TOP_UP" : "ADJUSTMENT", clientId: item.clientId });
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:border-lima hover:bg-lima/10 sm:flex-row sm:items-center sm:justify-between"
    >
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
    </Link>
  );
}
