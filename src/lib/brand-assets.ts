import { existsSync } from "node:fs";
import { join } from "node:path";

/** Official CTI files live in /public/brand. Missing files fall back to the wordmark. */
export function getBrandLogoSrc(variant: "onLight" | "onNavy" = "onLight"): string | null {
  const file = variant === "onNavy" ? "logo-on-navy.svg" : "logo.svg";
  const absolute = join(process.cwd(), "public/brand", file);
  return existsSync(absolute) ? `/brand/${file}` : null;
}
