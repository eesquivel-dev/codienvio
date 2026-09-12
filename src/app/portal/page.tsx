import { QuoteForm } from "@/components/quote-form";
import { PageHeading } from "@/components/page-heading";

export default function PortalPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Portal cliente"
        title="Cotizar envío doméstico"
        description="Origen y destino en México. Verás el precio final con comisión; no el costo de Envia."
      />
      <QuoteForm />
    </div>
  );
}
