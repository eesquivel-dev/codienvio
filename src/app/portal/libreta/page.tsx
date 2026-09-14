import Link from "next/link";
import { AddressBook } from "@/app/portal/libreta/address-book";
import { PackagePresets } from "@/app/portal/libreta/package-presets";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireClient } from "@/lib/auth";
import { clientCopy } from "@/lib/brand-copy";
import { listClientPresets } from "@/lib/saved-presets";

export default async function PortalLibretaPage() {
  const session = await requireClient();
  const presets = await listClientPresets(session.user.clientId!);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Libreta"
        description={clientCopy.libretaLead}
        backHref="/portal"
        actions={
          <Button asChild>
            <Link href="/portal#cotizar">Cotizar envío</Link>
          </Button>
        }
      />
      <AddressBook initialAddresses={presets.addresses} />
      <PackagePresets initialPackages={presets.packages} />
    </div>
  );
}
