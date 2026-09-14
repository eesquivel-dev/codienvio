"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientCopy } from "@/lib/brand-copy";
import { formatDateTimeMx } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PublicTracking } from "@/lib/tracking";

export function TrackingBar({
  variant = "on-light",
  initialGuia = "",
  id = "rastreo",
}: {
  variant?: "on-dark" | "on-light";
  initialGuia?: string;
  id?: string;
}) {
  const [guia, setGuia] = useState(initialGuia);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicTracking | null>(null);
  const dark = variant === "on-dark";

  async function lookup(value: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(`/api/rastreo?guia=${encodeURIComponent(value.trim())}`);
      const payload = (await response.json()) as PublicTracking | { error?: { message?: string } };
      if (!response.ok) {
        setError(
          "error" in payload && payload.error?.message
            ? payload.error.message
            : clientCopy.trackNotFound,
        );
        return;
      }
      setResult(payload as PublicTracking);
    } catch {
      setError(clientCopy.trackUnavailable);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialGuia.trim()) {
      void lookup(initialGuia);
    }
    // Autocomplete only the first URL value; later edits are submitted by the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    await lookup(guia);
  }

  return (
    <div id={id} className="space-y-3">
      <form
        onSubmit={onSubmit}
        className={cn(
          "flex flex-col gap-2 sm:flex-row sm:items-center",
          dark && "text-white",
        )}
      >
        <label className="sr-only" htmlFor={`${id}-input`}>
          {clientCopy.trackPlaceholder}
        </label>
        <Input
          id={`${id}-input`}
          value={guia}
          onChange={(event) => setGuia(event.target.value)}
          placeholder={clientCopy.trackPlaceholder}
          autoComplete="off"
          className={
            dark
              ? "h-11 border-white/25 bg-white text-navy placeholder:text-muted-foreground"
              : "h-11"
          }
        />
        <Button type="submit" size="lg" disabled={loading} className="sm:w-auto">
          <Search className="h-4 w-4" />
          {loading ? clientCopy.trackBusy : clientCopy.trackCta}
        </Button>
      </form>

      {error ? (
        <p
          className={
            dark
              ? "rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
              : "rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          }
        >
          {error}
        </p>
      ) : null}

      {result ? (
        <div
          className={
            dark
              ? "rounded-lg border border-white/15 bg-white/10 p-4 text-white"
              : "rounded-lg border border-navy/10 bg-white p-4"
          }
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-mono text-sm font-semibold">{result.trackingNumber}</p>
            <p className="text-sm font-semibold">{result.statusLabel}</p>
          </div>
          <p className={cn("mt-1 text-sm", dark ? "text-white/75" : "text-muted-foreground")}>
            {[result.carrierLabel, result.serviceName].filter(Boolean).join(" · ") || "Guía Código Envío"}
          </p>
          {result.events.length === 0 ? (
            <p className={cn("mt-3 text-sm", dark ? "text-white/75" : "text-muted-foreground")}>
              {clientCopy.trackNoEvents}
            </p>
          ) : (
            <ol className="mt-3 space-y-2 text-sm">
              {result.events.map((event, index) => (
                <li key={`${event.description}-${index}`}>
                  {event.date ? (
                    <span className={dark ? "text-white/55" : "text-muted-foreground"}>
                      {formatDateTimeMx(event.date)} ·{" "}
                    </span>
                  ) : null}
                  {event.description}
                </li>
              ))}
            </ol>
          )}
          {result.trackingUrl ? (
            <a
              href={result.trackingUrl}
              target="_blank"
              rel="noreferrer"
              className={cn("mt-3 inline-block text-sm underline", dark ? "text-lima" : "text-navy")}
            >
              Ver en la paquetería
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
