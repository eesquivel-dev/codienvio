import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PageHeader } from "@/components/page-header";
import { TrackingBar } from "@/components/tracking-bar";
import { Button } from "@/components/ui/button";
import { clientCopy } from "@/lib/brand-copy";

export default async function PublicTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ guia?: string }>;
}) {
  const params = await searchParams;
  const guia = params.guia?.trim() ?? "";

  return (
    <main className="min-h-screen bg-papel">
      <header className="bg-navy">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <BrandMark href="/" variant="on-dark" size="sm" />
          <Button asChild variant="inverse" size="sm">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </div>
        <div className="h-0.5 bg-lima" aria-hidden />
      </header>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <PageHeader title={clientCopy.trackPageTitle} description={clientCopy.trackPageLead} />
        <TrackingBar initialGuia={guia} />
      </div>
    </main>
  );
}
