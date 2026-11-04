import { describe, expect, it } from "vitest";
import { resolveBaseUrl } from "./base-url";

const h = (m: Record<string, string>) => ({ get: (k: string) => m[k.toLowerCase()] ?? null });

describe("resolveBaseUrl", () => {
  it("prefers NEXTAUTH_URL", () => {
    expect(resolveBaseUrl(h({ host: "x.onrender.com" }), "https://codigoenvio.com/")).toBe("https://codigoenvio.com");
  });
  it("falls back to forwarded host/proto", () => {
    expect(resolveBaseUrl(h({ host: "10.0.0.1:3000", "x-forwarded-host": "codienvio.onrender.com", "x-forwarded-proto": "https" }), undefined)).toBe("https://codienvio.onrender.com");
  });
  it("ignores a localhost NEXTAUTH_URL in production hosts", () => {
    expect(resolveBaseUrl(h({ host: "44-205-178-148.sslip.io" }), "http://localhost:3000")).toBe("https://44-205-178-148.sslip.io");
  });
  it("keeps http for localhost", () => {
    expect(resolveBaseUrl(h({ host: "localhost:3000" }), undefined)).toBe("http://localhost:3000");
  });
});
