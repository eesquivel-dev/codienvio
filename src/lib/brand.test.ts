import { describe, expect, it } from "vitest";
import { brand } from "./brand";

describe("CTI brand tokens", () => {
  it("matches Brand Identity Manual v1.0", () => {
    expect(brand.navy).toBe("#0B1B4B");
    expect(brand.lima).toBe("#C4E000");
    expect(brand.navyClaro).toBe("#1F3E8C");
    expect(brand.grisAzulado).toBe("#8FA0B8");
    expect(brand.grisPapel).toBe("#F6F7F9");
    expect(brand.blanco).toBe("#FFFFFF");
  });
});
