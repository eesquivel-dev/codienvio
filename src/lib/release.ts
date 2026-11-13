import packageJson from "../../package.json";

export type AppRelease = {
  version: string;
  commit: string;
  builtAt: string;
};

export type VersionPayload = {
  version: string;
  commit: string;
  builtAt: string;
};

const CDMX = "America/Mexico_City";

/**
 * Values inlined at `next build` via next.config `env`.
 * Direct `process.env.NEXT_PUBLIC_*` access is required so the build stamps
 * them into the bundle (a later `next start` must not replace the clock).
 */
export function readRelease(): AppRelease {
  return {
    version: process.env.NEXT_PUBLIC_APP_VERSION?.trim() || packageJson.version,
    commit: process.env.NEXT_PUBLIC_GIT_COMMIT?.trim() || "desconocido",
    builtAt: process.env.NEXT_PUBLIC_BUILD_TIME?.trim() || "",
  };
}

export function formatBuildTimeCdmx(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "fecha no disponible";

  const parts = new Intl.DateTimeFormat("es-MX", {
    timeZone: CDMX,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const day = pick("day");
  const month = pick("month");
  const year = pick("year");
  const hour = pick("hour");
  const minute = pick("minute");
  if (!day || !month || !year || !hour || !minute) return "fecha no disponible";
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

/** «Versión 1.4.0 · Publicado 13/11/2026 10:20 (hora CDMX) · a1b2c3d» */
export function formatReleaseLine(release: AppRelease): string {
  const published = release.builtAt
    ? `${formatBuildTimeCdmx(release.builtAt)} (hora CDMX)`
    : "sin fecha (hora CDMX)";
  const commit = release.commit ? ` · ${release.commit}` : "";
  return `Versión ${release.version} · Publicado ${published}${commit}`;
}

export function toVersionPayload(release: AppRelease): VersionPayload {
  return {
    version: release.version,
    commit: release.commit,
    builtAt: release.builtAt,
  };
}
