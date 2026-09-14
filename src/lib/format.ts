export const CARRIER_LABELS: Record<string, string> = {
  estafeta: "Estafeta",
  dhl: "DHL",
  fedex: "FedEx",
  ups: "UPS",
  paquetexpress: "Paquetexpress",
  redpack: "Redpack",
};

export function carrierLabel(carrier: string): string {
  return CARRIER_LABELS[carrier.toLowerCase()] ?? carrier;
}

export function shipmentStatusLabel(status: string): string {
  if (status === "PURCHASED") return "Comprada";
  if (status === "FAILED") return "Fallida";
  return status;
}

export function trackingStatusLabel(status: string): string {
  const map: Record<string, string> = {
    Created: "Creada",
    created: "Creada",
    Pending: "Creada",
    Pickup: "En tránsito",
    "In Transit": "En tránsito",
    in_transit: "En tránsito",
    "Out for Delivery": "En ruta",
    out_for_delivery: "En ruta",
    "En ruta": "En ruta",
    Delivered: "Entregada",
    delivered: "Entregada",
    Exception: "Incidencia",
    Returned: "Devuelta",
    Desconocido: "Desconocido",
  };
  return map[status] ?? map[status.replace(/[_-]+/g, " ")] ?? status;
}

export function formatDateTimeMx(value: string | Date): string {
  return new Date(value).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatTimeMx(value: string | Date): string {
  return new Date(value).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
