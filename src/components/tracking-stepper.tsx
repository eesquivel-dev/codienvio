import { Check, Truck } from "lucide-react";
import { trackingProgressFrom } from "@/lib/tracking-progress";
import { cn } from "@/lib/utils";

export function TrackingStepper({
  status,
  events,
  variant = "on-light",
}: {
  status: string;
  events?: Array<{ description?: string | null }>;
  variant?: "on-light" | "on-dark";
}) {
  const progress = trackingProgressFrom({ status, events });
  const dark = variant === "on-dark";

  return (
    <div className="space-y-2">
      <ol className="flex items-start">
        {progress.steps.map((step, index) => {
          const done = index < progress.currentIndex || progress.completed;
          const current = index === progress.currentIndex && !progress.completed;
          const exception = current && progress.exception;
          return (
            <li key={step.key} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {index === 0 ? <span className="w-3 shrink-0" /> : (
                  <span
                    className={cn(
                      "h-0.5 flex-1",
                      done || current
                        ? dark
                          ? "bg-lima"
                          : "bg-navy"
                        : dark
                          ? "bg-white/20"
                          : "bg-navy/15",
                    )}
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                    done && (dark ? "border-lima bg-lima text-navy" : "border-navy bg-navy text-white"),
                    current &&
                      !exception &&
                      (dark ? "border-lima bg-navy text-lima" : "border-lima bg-lima text-navy"),
                    exception && "border-destructive bg-destructive text-white",
                    !done && !current && (dark ? "border-white/25 bg-white/10 text-white/55" : "border-navy/20 bg-white text-navy/40"),
                  )}
                  aria-current={current ? "step" : undefined}
                >
                  {done ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : current ? (
                    <Truck className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                {index === progress.steps.length - 1 ? <span className="w-3 shrink-0" /> : (
                  <span
                    className={cn(
                      "h-0.5 flex-1",
                      done ? (dark ? "bg-lima" : "bg-navy") : dark ? "bg-white/20" : "bg-navy/15",
                    )}
                    aria-hidden
                  />
                )}
              </div>
              <p
                className={cn(
                  "mt-2 max-w-[4.8rem] text-center text-[0.6875rem] font-semibold leading-tight",
                  done || current ? (dark ? "text-white" : "text-navy") : dark ? "text-white/50" : "text-muted-foreground",
                  exception && "text-destructive",
                )}
              >
                {step.label}
              </p>
            </li>
          );
        })}
      </ol>
      {progress.exception ? (
        <p className={cn("text-center text-xs", dark ? "text-white/80" : "text-destructive")}>
          Hay una incidencia. Revisa los eventos o consulta a la paquetería.
        </p>
      ) : null}
    </div>
  );
}
