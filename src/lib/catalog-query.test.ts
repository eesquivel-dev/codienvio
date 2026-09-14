import { describe, expect, it } from "vitest";
import { matchesDateRange, matchesQuery } from "@/lib/catalog-query";

describe("matchesQuery", () => {
  it("ignora mayúsculas y campos vacíos", () => {
    expect(matchesQuery(["Tienda Demo", null, "  "], "demo")).toBe(true);
    expect(matchesQuery(["Ana"], "  ")).toBe(true);
    expect(matchesQuery(["Ana"], "pedro")).toBe(false);
  });
});

describe("matchesDateRange", () => {
  it("filtra por día inclusivo en zona MX", () => {
    expect(matchesDateRange("2026-09-13T05:59:59.000Z", "2026-09-12", "2026-09-12")).toBe(true);
    expect(matchesDateRange("2026-09-13T06:00:00.000Z", "2026-09-12", "2026-09-12")).toBe(false);
    expect(matchesDateRange("2026-09-13T06:00:00.000Z", null, null)).toBe(true);
  });
});
