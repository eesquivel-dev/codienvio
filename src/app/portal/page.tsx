import { QuoteForm } from "@/components/quote-form";

export default function PortalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cotizar envío doméstico</h1>
        <p className="text-sm text-muted-foreground">
          Origen y destino en México. Verás el precio final con comisión; no el costo de Envia.
        </p>
      </div>
      <QuoteForm />
    </div>
  );
}
