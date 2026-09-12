import { BrandMark } from "@/components/brand-mark";

export { BrandMark };

/** Contextual lockup: official CodiEnvio wordmark + optional page subtitle. */
export function BrandLockup({
  subtitle,
  size = "md",
  tone = "default",
}: {
  subtitle?: string;
  size?: "sm" | "md" | "lg";
  tone?: "default" | "inverse";
}) {
  return (
    <span className="inline-flex flex-col gap-1">
      <BrandMark size={size} variant={tone === "inverse" ? "on-dark" : "on-light"} />
      {subtitle ? (
        <span
          className={
            tone === "inverse"
              ? "type-overline text-white/60"
              : "type-overline text-azul-gris"
          }
        >
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}
