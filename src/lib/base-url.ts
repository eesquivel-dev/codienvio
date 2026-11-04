/** Public base URL: NEXTAUTH_URL when set, otherwise the request host (Render / AWS / local). */
export function resolveBaseUrl(h: { get(name: string): string | null }, envUrl = process.env.NEXTAUTH_URL): string {
  const fromEnv = envUrl?.trim();
  if (fromEnv && !/localhost|127\.0\.0\.1/.test(fromEnv)) return fromEnv.replace(/\/+$/, "");
  const host = h.get("x-forwarded-host")?.split(",")[0].trim() || h.get("host");
  if (!host) return (fromEnv || "http://localhost:3000").replace(/\/+$/, "");
  const proto =
    h.get("x-forwarded-proto")?.split(",")[0].trim() || (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
