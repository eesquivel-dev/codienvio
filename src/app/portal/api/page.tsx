import Link from "next/link";
import { headers } from "next/headers";
import { ApiConsole } from "@/app/portal/api/api-console";
import { PageHeader } from "@/components/page-header";
import { requireClient } from "@/lib/auth";
import { resolveBaseUrl } from "@/lib/base-url";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PortalApiPage() {
  const session = await requireClient();
  const baseUrl = resolveBaseUrl(await headers());
  const keys = await prisma.apiKey.findMany({
    where: { clientId: session.user.clientId!, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { prefix: true, createdAt: true, lastUsedAt: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="API pública v1"
        description="Tu API key, una cotización de prueba y la documentación para integrar tu sistema."
      />
      <p className="text-sm text-muted-foreground">
        Base URL: <code>{baseUrl}</code> ·{" "}
        <Link className="underline" href="/docs">Documentación</Link> ·{" "}
        <a className="underline" href="/openapi.yaml" target="_blank" rel="noreferrer">openapi.yaml</a>
      </p>
      <ApiConsole
        baseUrl={baseUrl}
        activeKeys={keys.map((k) => ({
          prefix: k.prefix,
          createdAt: k.createdAt.toISOString(),
          lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
