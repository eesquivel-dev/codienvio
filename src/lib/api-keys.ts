import { createHash, randomBytes } from "node:crypto";

const KEY_PREFIX = "ce_live_";

export function hashApiKey(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

export function generateApiKey(): { plain: string; hash: string; prefix: string } {
  const secret = randomBytes(24).toString("base64url");
  const plain = `${KEY_PREFIX}${secret}`;
  return {
    plain,
    hash: hashApiKey(plain),
    prefix: plain.slice(0, 16),
  };
}

export function looksLikeApiKey(value: string): boolean {
  return value.startsWith("ce_live_") || value.startsWith("ce_test_");
}
