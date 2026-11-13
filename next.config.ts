import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { captureReleaseEnv } from "./src/lib/release-stamp";

/**
 * Release identity inlined at `next build` (Render and the EC2 host).
 * Version comes from package.json.
 * builtAt is BUILD_TIME when set, otherwise the build clock (shown in America/Mexico_City).
 * Commit is RENDER_GIT_COMMIT (Render), else GIT_COMMIT, else `git rev-parse --short HEAD`.
 */
function gitRevParseShort(): string | null {
  try {
    return execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

const release = captureReleaseEnv({
  env: process.env,
  packageJson: readFileSync(new URL("./package.json", import.meta.url), "utf8"),
  now: new Date(),
  revParse: gitRevParseShort,
});

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: release.version,
    NEXT_PUBLIC_GIT_COMMIT: release.commit,
    NEXT_PUBLIC_BUILD_TIME: release.builtAt,
  },
};

export default nextConfig;
