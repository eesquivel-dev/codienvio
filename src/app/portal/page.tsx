import { PageHeading } from "@/components/page-heading";
import { QuoteForm } from "@/components/quote-form";

export default function PortalPage() {
  return (
    <div className="space-y-6">
      <PageHeading title="Cotizar envío doméstico">
        Origen y destino en México. Verás el precio final con comisión; no el costo de Envia.
      </PageHeading>
      <QuoteForm />
    </div>
  );
}
