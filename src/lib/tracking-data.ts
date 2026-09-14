import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getActiveProvider, resolveEnviaToken } from "@/lib/settings";
import {
  isValidTrackingNumber,
  mockPublicTracking,
  normalizeTrackingNumber,
  toPublicTracking,
  type PublicTracking,
} from "@/lib/tracking";

export async function lookupPublicTracking(raw: string): Promise<PublicTracking | null> {
  if (!isValidTrackingNumber(raw)) {
    throw new AppError("Indica un número de rastreo válido (6 a 40 caracteres).", 400, "INVALID_TRACKING");
  }
  const trackingNumber = normalizeTrackingNumber(raw);

  const shipment = await prisma.shipment.findFirst({
    where: { trackingNumber: { equals: trackingNumber, mode: "insensitive" } },
    select: {
      trackingNumber: true,
      carrier: true,
      serviceName: true,
      status: true,
      trackingUrl: true,
      createdAt: true,
    },
  });

  const resolved = await resolveEnviaToken();
  if (resolved.mock) {
    if (!shipment?.trackingNumber) return null;
    return mockPublicTracking({
      trackingNumber: shipment.trackingNumber,
      createdAt: shipment.createdAt,
      shipmentStatus: shipment.status,
      carrier: shipment.carrier,
      serviceName: shipment.serviceName,
      trackingUrl: shipment.trackingUrl,
    });
  }

  const provider = await getActiveProvider();
  try {
    const rows = await provider.track([trackingNumber]);
    const row = rows.find((item) => normalizeTrackingNumber(item.trackingNumber) === trackingNumber) ?? rows[0];
    if (row?.trackingNumber) {
      return toPublicTracking({
        trackingNumber: row.trackingNumber,
        status: row.status,
        carrier: shipment?.carrier,
        serviceName: shipment?.serviceName,
        events: row.events,
        trackingUrl: shipment?.trackingUrl,
      });
    }
  } catch {
    if (!shipment) return null;
  }

  if (!shipment?.trackingNumber) return null;
  return toPublicTracking({
    trackingNumber: shipment.trackingNumber,
    status: shipment.status === "FAILED" ? "Exception" : "Created",
    carrier: shipment.carrier,
    serviceName: shipment.serviceName,
    trackingUrl: shipment.trackingUrl,
    events: shipment.status === "FAILED"
      ? [{ description: "No se pudo generar la guía." }]
      : [{ description: "Guía registrada. El rastreo se actualizará en breve." }],
  });
}
