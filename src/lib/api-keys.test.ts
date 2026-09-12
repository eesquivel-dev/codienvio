import { describe, expect, it } from "vitest";
import { generateApiKey, hashApiKey, looksLikeApiKey } from "@/lib/api-keys";

describe("api keys", () => {
  it("genera key ce_live_ y hash estable", () => {
    const key = generateApiKey();
    expect(key.plain.startsWith("ce_live_")).toBe(true);
    expect(hashApiKey(key.plain)).toBe(key.hash);
    expect(looksLikeApiKey(key.plain)).toBe(true);
    expect(looksLikeApiKey("not-a-key")).toBe(false);
  });
});
