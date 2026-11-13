/** Build-time release identity. Used by next.config; not imported from the client. */

export function readPackageVersion(packageJson: string): string {
  let parsed: { version?: unknown };
  try {
    parsed = JSON.parse(packageJson) as { version?: unknown };
  } catch {
    throw new Error("package.json no es JSON válido");
  }
  if (typeof parsed.version !== "string" || !parsed.version.trim()) {
    throw new Error("package.json no tiene version");
  }
  return parsed.version.trim();
}

type BuildEnv = NodeJS.ProcessEnv;

/** Full SHAs become 7 hex chars. Anything else is trimmed to a short label. */
export function shortCommit(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (/^[0-9a-f]{7,40}$/i.test(value)) return value.slice(0, 7).toLowerCase();
  return value.slice(0, 12);
}

/**
 * Render sets RENDER_GIT_COMMIT. EC2 / other hosts can set GIT_COMMIT.
 * Otherwise the caller runs `git rev-parse --short HEAD`.
 */
export function resolveCommit(env: BuildEnv, revParse: () => string | null): string {
  const fromRender = env.RENDER_GIT_COMMIT?.trim() ?? "";
  if (fromRender) return shortCommit(fromRender) || "desconocido";
  const fromGit = env.GIT_COMMIT?.trim() ?? "";
  if (fromGit) return shortCommit(fromGit) || "desconocido";
  const fromRev = revParse()?.trim() ?? "";
  if (fromRev) return shortCommit(fromRev) || "desconocido";
  return "desconocido";
}

/** BUILD_TIME (ISO-8601) when the deploy sets it; otherwise the build clock. */
export function resolveBuildTime(env: BuildEnv, now: Date): string {
  const explicit = env.BUILD_TIME?.trim() ?? "";
  if (explicit) {
    const parsed = new Date(explicit);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return now.toISOString();
}

export function captureReleaseEnv(input: {
  env: NodeJS.ProcessEnv;
  packageJson: string;
  now: Date;
  revParse: () => string | null;
}): { version: string; commit: string; builtAt: string } {
  return {
    version: readPackageVersion(input.packageJson),
    commit: resolveCommit(input.env, input.revParse),
    builtAt: resolveBuildTime(input.env, input.now),
  };
}
