/** Shared dashboard links, thresholds and query helpers (admin + portal). */

export const LOW_BALANCE_MXN = 200;

export type DashboardRange = { from: string | null; to: string | null };

function withParams(path: string, params: Record<string, string | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const trimmed = value?.trim();
    if (trimmed) search.set(key, trimmed);
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export function adminEnviosHref(filters: {
  status?: string | null;
  carrier?: string | null;
  clientId?: string | null;
  from?: string | null;
  to?: string | null;
} = {}): string {
  return withParams("/admin/envios", {
    status: filters.status,
    carrier: filters.carrier,
    clientId: filters.clientId,
    from: filters.from,
    to: filters.to,
  });
}

export function adminReportesHref(filters: {
  kind?: string | null;
  clientId?: string | null;
  carrier?: string | null;
  from?: string | null;
  to?: string | null;
} = {}): string {
  return withParams("/admin/reportes", {
    kind: filters.kind,
    clientId: filters.clientId,
    carrier: filters.carrier,
    from: filters.from,
    to: filters.to,
  });
}

export function adminFacturacionHref(filters: {
  kind?: string | null;
  clientId?: string | null;
  from?: string | null;
  to?: string | null;
} = {}): string {
  return withParams("/admin/facturacion", {
    kind: filters.kind,
    clientId: filters.clientId,
    from: filters.from,
    to: filters.to,
  });
}

export function adminClientesHref(status?: string | null): string {
  return withParams("/admin/clientes", { status });
}

export function portalEnviosHref(filters: {
  status?: string | null;
  from?: string | null;
  to?: string | null;
} = {}): string {
  return withParams("/portal/envios", {
    status: filters.status,
    from: filters.from,
    to: filters.to,
  });
}

export function isLowBalance(balanceMxn: number, threshold = LOW_BALANCE_MXN): boolean {
  return balanceMxn < threshold;
}
