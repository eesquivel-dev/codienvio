import { describe, expect, it } from "vitest";
import { brand } from "./brand";
import { CLIENT_COPY_FORBIDDEN, clientCopy } from "./brand-copy";

describe("Código Envío brand tokens", () => {
  it("matches the official lockup navy + lima", () => {
    expect(brand.navy).toBe("#0B1B4B");
    expect(brand.lima).toBe("#C4E000");
    expect(brand.navyClaro).toBe("#1F3E8C");
    expect(brand.grisAzulado).toBe("#8FA0B8");
    expect(brand.grisPapel).toBe("#F6F7F9");
    expect(brand.blanco).toBe("#FFFFFF");
    expect(brand.name).toBe("Código Envío");
    expect(brand.logo.lockup).toBe("/brand/codigo-envio-lockup.png");
    expect(brand.typeface).toBe("Poppins");
    expect(brand.typeWeights).toEqual([400, 500, 600, 700, 800]);
  });
});

describe("client-facing commercial copy", () => {
  it("does not frame the product as resale or a hidden carrier deal", () => {
    const blob = Object.values(clientCopy)
      .map((value) => (typeof value === "function" ? value("$100.00") : value))
      .join("\n");
    expect(blob).not.toMatch(CLIENT_COPY_FORBIDDEN);
    expect(clientCopy.productName).toBe("Código Envío");
  });
});
