import { carrierLabel, trackingStatusLabel } from "@/lib/format";

export type PublicTrackingEvent = {
  description: string;
  date?: string;
};

export type PublicTracking = {
  trackingNumber: string;
  status: string;
  statusLabel: string;
  carrier: string | null;
  carrierLabel: string | null;
  serviceName: string | null;
  events: PublicTrackingEvent[];
  trackingUrl: string | null;
};

const TRACKING_RE = /^[A-Z0-9-]{6,40}$/;

export function normalizeTrackingNumber(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidTrackingNumber(raw: string): boolean {
  return TRACKING_RE.test(normalizeTrackingNumber(raw));
}

export function toPublicTracking(input: {
  trackingNumber: string;
  status: string;
  carrier?: string | null;
  serviceName?: string | null;
  events?: PublicTrackingEvent[];
  trackingUrl?: string | null;
}): PublicTracking {
  const trackingNumber = normalizeTrackingNumber(input.trackingNumber);
  return {
    trackingNumber,
    status: input.status,
    statusLabel: trackingStatusLabel(input.status),
    carrier: input.carrier ?? null,
    carrierLabel: input.carrier ? carrierLabel(input.carrier) : null,
    serviceName: input.serviceName ?? null,
    events: input.events ?? [],
    trackingUrl: input.trackingUrl ?? null,
  };
}

/** Simulated timeline for local demo / mock-mode guides. */
export function mockPublicTracking(input: {
  trackingNumber: string;
  createdAt: string | Date;
  shipmentStatus: string;
  carrier?: string | null;
  serviceName?: string | null;
  trackingUrl?: string | null;
  now?: Date;
}): PublicTracking {
  const created = new Date(input.createdAt);
  const hours = Math.max(0, ((input.now ?? new Date()).getTime() - created.getTime()) / 3_600_000);

  if (input.shipmentStatus === "FAILED") {
    return toPublicTracking({
      trackingNumber: input.trackingNumber,
      status: "Exception",
      carrier: input.carrier,
      serviceName: input.serviceName,
      trackingUrl: input.trackingUrl,
      events: [{ description: "No se pudo generar la guía.", date: created.toISOString() }],
    });
  }

  const createdEvent = { description: "Guía creada", date: created.toISOString() };
  const transitEvent = {
    description: "En tránsito hacia el destino",
    date: new Date(created.getTime() + 26 * 3_600_000).toISOString(),
  };
  const outForDeliveryEvent = {
    description: "En ruta de entrega",
    date: new Date(created.getTime() + 50 * 3_600_000).toISOString(),
  };
  if (hours < 24) {
    return toPublicTracking({
      trackingNumber: input.trackingNumber,
      status: "Created",
      carrier: input.carrier,
      serviceName: input.serviceName,
      trackingUrl: input.trackingUrl,
      events: [createdEvent],
    });
  }
  if (hours < 48) {
    return toPublicTracking({
      trackingNumber: input.trackingNumber,
      status: "In Transit",
      carrier: input.carrier,
      serviceName: input.serviceName,
      trackingUrl: input.trackingUrl,
      events: [transitEvent, createdEvent],
    });
  }
  if (hours < 72) {
    return toPublicTracking({
      trackingNumber: input.trackingNumber,
      status: "Out for Delivery",
      carrier: input.carrier,
      serviceName: input.serviceName,
      trackingUrl: input.trackingUrl,
      events: [outForDeliveryEvent, transitEvent, createdEvent],
    });
  }
  return toPublicTracking({
    trackingNumber: input.trackingNumber,
    status: "Delivered",
    carrier: input.carrier,
    serviceName: input.serviceName,
    trackingUrl: input.trackingUrl,
    events: [
      { description: "Entregada", date: new Date(created.getTime() + 80 * 3_600_000).toISOString() },
      outForDeliveryEvent,
      transitEvent,
      createdEvent,
    ],
  });
}

export const PUBLIC_TRACKING_FORBIDDEN_KEYS = [
  "clientPrice",
  "providerCost",
  "feeAmount",
  "clientId",
  "clientName",
  "clientEmail",
  "price",
] as const;
