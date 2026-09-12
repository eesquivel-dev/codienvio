import type { ReactNode } from "react";
import Link from "next/link";
import { BadgePercent, PackageCheck, Store, Wallet } from "lucide-react";
import { getAdminDashboardView } from "@/app/admin/actions";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { carrierLabel, formatDateTimeMx } from "@/lib/format";
import { formatMxn } from "@/lib/money";

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardView();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel"
        description="Resumen de ventas, margen y envíos recientes. El costo de Envia solo se ve aquí."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/configuracion">Ir a configuración</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Store className="h-4 w-4" />}
          label="Ventas"
          value={String(stats.salesCount)}
          hint={`${stats.purchasedCount} guías compradas`}
        />
        <StatCard
          icon={<BadgePercent className="h-4 w-4" />}
          label="Margen"
          value={formatMxn(stats.marginTotal)}
          hint="Comisión acumulada"
        />
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Ingreso cliente"
          value={formatMxn(stats.revenueTotal)}
          hint={`Costo Envia ${formatMxn(stats.costTotal)}`}
        />
        <StatCard
          icon={<PackageCheck className="h-4 w-4" />}
          label="Clientes activos"
          value={String(stats.activeClients)}
          hint={stats.failedCount ? `${stats.failedCount} envíos fallidos` : "Sin fallos"}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Envíos recientes</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/envios">Ver todos</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay ventas. Compra una guía desde el portal demo (o activa modo simulado en
              Configuración) para ver margen aquí.
            </p>
          ) : (
            stats.recent.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{item.clientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {carrierLabel(item.carrier)} · {item.trackingNumber ?? "sin rastreo"} ·{" "}
                    {formatDateTimeMx(item.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="tabular-nums text-muted-foreground">
                    margen {formatMxn(item.feeAmount)}
                  </span>
                  <span className="font-semibold tabular-nums text-navy">{formatMxn(item.price)}</span>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums text-navy">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
