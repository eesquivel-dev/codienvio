"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

function sameOriginReferrer(): boolean {
  if (typeof document === "undefined" || !document.referrer) return false;
  try {
    return new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function BackLink({
  href,
  label = "Volver",
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  function onClick() {
    if (sameOriginReferrer()) {
      router.back();
      return;
    }
    router.push(href);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium text-navy/70 transition-colors hover:text-navy",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
