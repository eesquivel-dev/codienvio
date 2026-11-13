import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatBuildTimeCdmx, formatReleaseLine, readRelease, toVersionPayload } from "./release";
import {
  captureReleaseEnv,
  readPackageVersion,
  resolveBuildTime,
  resolveCommit,
  shortCommit,
} from "./release-stamp";

const FULL_SHA = "a1b2c3d4e5f6789012345678abcdef0123456789";

describe("formatBuildTimeCdmx", () => {
  it("formats an instant in America/Mexico_City as dd/mm/yyyy HH:mm", () => {
    expect(formatBuildTimeCdmx("2026-11-13T16:20:00.000Z")).toBe("13/11/2026 10:20");
  });

  it("keeps the previous calendar day before 06:00 UTC", () => {
    expect(formatBuildTimeCdmx("2026-01-01T05:59:00.000Z")).toBe("31/12/2025 23:59");
    expect(formatBuildTimeCdmx("2026-01-01T06:00:00.000Z")).toBe("01/01/2026 00:00");
  });

  it("does not throw on an invalid timestamp", () => {
    expect(formatBuildTimeCdmx("no-es-fecha")).toBe("fecha no disponible");
  });
});

describe("formatReleaseLine", () => {
  it("matches the footer copy", () => {
    expect(
      formatReleaseLine({
        version: "1.4.0",
        commit: "a1b2c3d",
        builtAt: "2026-11-13T16:20:00.000Z",
      }),
    ).toBe("Versión 1.4.0 · Publicado 13/11/2026 10:20 (hora CDMX) · a1b2c3d");
  });
});

describe("resolveCommit", () => {
  it("prefers RENDER_GIT_COMMIT, then GIT_COMMIT, then git rev-parse", () => {
    const revParse = () => "fromgit1";
    expect(
      resolveCommit({ RENDER_GIT_COMMIT: FULL_SHA, GIT_COMMIT: "bbbbbbb" }, revParse),
    ).toBe("a1b2c3d");
    expect(resolveCommit({ GIT_COMMIT: "ABCDEF1" }, revParse)).toBe("abcdef1");
    expect(resolveCommit({}, revParse)).toBe("fromgit1");
  });

  it("falls back when git is unavailable", () => {
    expect(resolveCommit({}, () => null)).toBe("desconocido");
    expect(resolveCommit({ RENDER_GIT_COMMIT: "   " }, () => "")).toBe("desconocido");
  });

  it("shortens a full sha and keeps a short label", () => {
    expect(shortCommit(FULL_SHA)).toBe("a1b2c3d");
    expect(shortCommit("abc1234")).toBe("abc1234");
    expect(shortCommit("")).toBe("");
  });
});

describe("resolveBuildTime", () => {
  const now = new Date("2026-11-13T16:20:00.000Z");

  it("uses BUILD_TIME when it parses", () => {
    expect(resolveBuildTime({ BUILD_TIME: "2026-05-01T15:00:00.000Z" }, now)).toBe(
      "2026-05-01T15:00:00.000Z",
    );
  });

  it("uses the build clock when BUILD_TIME is missing or invalid", () => {
    expect(resolveBuildTime({}, now)).toBe("2026-11-13T16:20:00.000Z");
    expect(resolveBuildTime({ BUILD_TIME: "ayer" }, now)).toBe("2026-11-13T16:20:00.000Z");
  });
});

describe("captureReleaseEnv", () => {
  it("reads package.json version and the build stamp", () => {
    const release = captureReleaseEnv({
      env: { GIT_COMMIT: FULL_SHA, BUILD_TIME: "2026-11-13T16:20:00.000Z" },
      packageJson: JSON.stringify({ version: "1.0.0" }),
      now: new Date("2020-01-01T00:00:00.000Z"),
      revParse: () => "should-not-win",
    });
    expect(release).toEqual({
      version: "1.0.0",
      commit: "a1b2c3d",
      builtAt: "2026-11-13T16:20:00.000Z",
    });
  });

  it("rejects a package.json without version", () => {
    expect(() => readPackageVersion("{}")).toThrow(/version/);
    expect(() => readPackageVersion("nope")).toThrow(/JSON/);
  });
});

describe("readRelease", () => {
  it("falls back to package.json version when the build env is absent", () => {
    const previous = {
      version: process.env.NEXT_PUBLIC_APP_VERSION,
      commit: process.env.NEXT_PUBLIC_GIT_COMMIT,
      builtAt: process.env.NEXT_PUBLIC_BUILD_TIME,
    };
    delete process.env.NEXT_PUBLIC_APP_VERSION;
    delete process.env.NEXT_PUBLIC_GIT_COMMIT;
    delete process.env.NEXT_PUBLIC_BUILD_TIME;
    try {
      const release = readRelease();
      expect(release.version).toBe("1.0.0");
      expect(release.commit).toBe("desconocido");
      expect(release.builtAt).toBe("");
      expect(toVersionPayload(release)).toEqual({
        version: "1.0.0",
        commit: "desconocido",
        builtAt: "",
      });
    } finally {
      restore("NEXT_PUBLIC_APP_VERSION", previous.version);
      restore("NEXT_PUBLIC_GIT_COMMIT", previous.commit);
      restore("NEXT_PUBLIC_BUILD_TIME", previous.builtAt);
    }
  });
});

describe("release wiring", () => {
  it("injects version, BUILD_TIME, and commit in next.config", () => {
    const config = readFileSync("next.config.ts", "utf8");
    const stamp = readFileSync("src/lib/release-stamp.ts", "utf8");
    expect(stamp).toMatch(/RENDER_GIT_COMMIT/);
    expect(stamp).toMatch(/GIT_COMMIT/);
    expect(stamp).toMatch(/BUILD_TIME/);
    expect(config).toMatch(/git rev-parse --short HEAD/);
    expect(config).toMatch(/NEXT_PUBLIC_APP_VERSION/);
    expect(config).toMatch(/NEXT_PUBLIC_BUILD_TIME/);
    expect(config).toMatch(/NEXT_PUBLIC_GIT_COMMIT/);
    expect(config).toMatch(/captureReleaseEnv/);
  });

  it("renders the footer from the root layout on every surface", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    const footer = readFileSync("src/components/app-version-footer.tsx", "utf8");
    expect(layout).toMatch(/AppVersionFooter/);
    expect(footer).toMatch(/Versión /);
    expect(footer).toMatch(/Publicado /);
    expect(footer).toMatch(/hora CDMX/);
    expect(footer).not.toMatch(/reventa/i);
  });
});

function restore(
  key: "NEXT_PUBLIC_APP_VERSION" | "NEXT_PUBLIC_GIT_COMMIT" | "NEXT_PUBLIC_BUILD_TIME",
  value: string | undefined,
) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
