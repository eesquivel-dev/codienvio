import { formatBuildTimeCdmx, readRelease } from "@/lib/release";

export function AppVersionFooter() {
  const release = readRelease();
  const published = release.builtAt ? formatBuildTimeCdmx(release.builtAt) : "sin fecha";

  return (
    <footer className="border-t border-border bg-white" data-app-version={release.version}>
      <p className="type-caption mx-auto flex max-w-7xl items-start gap-2 px-4 py-2.5 text-azul-gris">
        <span className="mt-[0.35rem] h-1.5 w-1.5 shrink-0 rounded-full bg-lima" aria-hidden />
        <span>
          <span className="font-semibold text-navy">Versión {release.version}</span>
          <span aria-hidden> · </span>
          Publicado {published} (hora CDMX)
          <span aria-hidden> · </span>
          <span className="font-semibold text-navy">{release.commit}</span>
        </span>
      </p>
    </footer>
  );
}
