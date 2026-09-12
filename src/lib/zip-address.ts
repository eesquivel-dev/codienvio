import type { ZipLookup } from "@/lib/providers/types";

export type ZipFieldStatus = "idle" | "loading" | "found" | "not_found" | "error";

export function isCompletePostalCode(code: string): boolean {
  return /^\d{5}$/.test(code);
}

export function uniqueSuburbs(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const suburbs: string[] = [];
  for (const value of values) {
    const name = String(value ?? "").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    suburbs.push(name);
  }
  return suburbs;
}

/** Keep the current colonia when it is still valid; auto-pick if there is only one. */
export function resolveColonia(current: string, suburbs: string[]): string {
  if (suburbs.length === 0) return current;
  if (current && suburbs.includes(current)) return current;
  if (suburbs.length === 1) return suburbs[0] ?? "";
  return "";
}

export function applyZipLookup<
  T extends { postalCode: string; city: string; state: string; district: string },
>(current: T, lookup: ZipLookup): T {
  return {
    ...current,
    postalCode: lookup.postalCode || current.postalCode,
    city: lookup.city,
    state: lookup.state || current.state,
    district: resolveColonia(current.district, lookup.suburbs),
  };
}

export function zipFieldMessage(
  status: ZipFieldStatus,
  suburbCount = 0,
): { hint?: string; error?: string } {
  switch (status) {
    case "loading":
      return { hint: "Consultando código postal…" };
    case "found":
      if (suburbCount > 1) {
        return { hint: `${suburbCount} colonias encontradas. Elige una.` };
      }
      if (suburbCount === 1) {
        return { hint: "Colonia, ciudad y estado completados." };
      }
      return { hint: "Ciudad y estado completados." };
    case "not_found":
      return { error: "No se encontró el código postal" };
    case "error":
      return { error: "No se pudo consultar el código postal. Intenta de nuevo." };
    default:
      return { hint: "5 dígitos. Completa colonia, ciudad y estado al escribir." };
  }
}
