export const TRACKING_STEPS = [
  { key: "created", label: "Creada" },
  { key: "transit", label: "En tránsito" },
  { key: "out_for_delivery", label: "En ruta" },
  { key: "delivered", label: "Entregada" },
] as const;

export type TrackingStepKey = (typeof TRACKING_STEPS)[number]["key"];

export type TrackingProgress = {
  steps: typeof TRACKING_STEPS;
  /** Highest reached step, 0–3. */
  currentIndex: number;
  completed: boolean;
  exception: boolean;
};

const EXCEPTION_RE =
  /\b(exception|incidencia|returned|devuelt|cancel|fallid|error|undeliverable)\b/i;

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function stepFromStatus(status: string): { index: number; exception: boolean } {
  const value = normalizeStatus(status);
  if (!value) return { index: 0, exception: false };
  if (EXCEPTION_RE.test(value) || value === "failed") {
    return { index: 0, exception: true };
  }
  if (/\b(delivered|entregad)\b/.test(value)) return { index: 3, exception: false };
  if (
    /\b(out for delivery|en ruta|on route|last mile|reparto|para entrega|out for deliv)\b/.test(
      value,
    )
  ) {
    return { index: 2, exception: false };
  }
  if (
    /\b(in transit|tr[aá]nsito|pickup|collected|recolect|in transit to|en camino)\b/.test(value)
  ) {
    return { index: 1, exception: false };
  }
  if (/\b(created|cread|pending|label|information received|pre transit|registered)\b/.test(value)) {
    return { index: 0, exception: false };
  }
  return { index: 0, exception: false };
}

function stepFromDescription(description: string): { index: number; exception: boolean } {
  return stepFromStatus(description);
}

export function trackingProgressFrom(input: {
  status?: string | null;
  events?: Array<{ description?: string | null }>;
}): TrackingProgress {
  const fromStatus = stepFromStatus(input.status ?? "");
  let index = fromStatus.index;
  let exception = fromStatus.exception;

  for (const event of input.events ?? []) {
    const fromEvent = stepFromDescription(event.description ?? "");
    if (fromEvent.exception) exception = true;
    if (fromEvent.index > index) index = fromEvent.index;
  }

  if (index === 3) exception = false;

  return {
    steps: TRACKING_STEPS,
    currentIndex: index,
    completed: index >= 3,
    exception: exception && index < 3,
  };
}
