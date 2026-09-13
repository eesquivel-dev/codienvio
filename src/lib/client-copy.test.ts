import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLIENT_COPY_FORBIDDEN } from "./brand-copy";

const CLIENT_FACING_FILES = [
  "src/app/page.tsx",
  "src/app/login/page.tsx",
  "src/app/docs/page.tsx",
  "src/app/layout.tsx",
  "src/app/portal/page.tsx",
  "src/app/portal/saldo/page.tsx",
  "src/app/portal/envios/page.tsx",
  "src/app/portal/saldo/top-up-form.tsx",
  "src/components/quote-form.tsx",
  "src/components/brand-mark.tsx",
  "public/openapi.yaml",
] as const;

describe("client-facing surfaces", () => {
  it.each(CLIENT_FACING_FILES)("%s avoids resale / hidden-carrier framing", (file) => {
    const source = readFileSync(file, "utf8");
    expect(source).not.toMatch(CLIENT_COPY_FORBIDDEN);
  });
});
