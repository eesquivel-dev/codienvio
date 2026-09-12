import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("CTI Group brand tokens", () => {
  it("declares the mandatory palette from Brand Identity Manual v1.0", () => {
    expect(css).toMatch(/--navy:\s*#0b1b4b/i);
    expect(css).toMatch(/--lima:\s*#c4e000/i);
    expect(css).toMatch(/--navy-claro:\s*#1f3e8c/i);
    expect(css).toMatch(/--gris-azulado:\s*#8fa0b8/i);
    expect(css).toMatch(/--gris-papel:\s*#f6f7f9/i);
    expect(css).toMatch(/--blanco:\s*#ffffff/i);
  });

  it("uses Poppins as the primary sans stack with Arial fallback", () => {
    expect(css).toMatch(/--font-poppins/);
    expect(css).toMatch(/Arial/);
  });
});
