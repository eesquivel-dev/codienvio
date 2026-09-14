"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

function isActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/portal") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader({
  name,
  role,
  items,
  balanceLabel,
}: {
  name?: string | null;
  role: "ADMIN" | "CLIENT";
  items: NavItem[];
  balanceLabel?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const home = role === "ADMIN" ? "/admin" : "/portal";

  return (
    <header className="sticky top-0 z-40 bg-navy text-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-5">
          <BrandMark href={home} variant="on-dark" size="sm" />
          <nav className="hidden items-center gap-0.5 lg:flex">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-[0.8125rem] font-medium tracking-[-0.011em] text-white/70 transition-colors hover:bg-white/10 hover:text-white",
                    active && "bg-white/10 text-white",
                  )}
                >
                  <span className={cn(active && "border-b-2 border-lima pb-0.5")}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {balanceLabel ? (
            role === "CLIENT" ? (
              <Link
                href="/portal/saldo"
                className="rounded-full bg-lima px-2.5 py-1 text-xs font-semibold text-navy hover:bg-[color:var(--lima-hover)]"
              >
                Saldo {balanceLabel}
              </Link>
            ) : (
              <span className="rounded-full bg-lima px-2.5 py-1 text-xs font-semibold text-navy">
                Saldo {balanceLabel}
              </span>
            )
          ) : null}
          <span className="hidden max-w-[14rem] truncate text-[0.8125rem] font-medium tracking-[-0.011em] text-white/65 sm:inline">
            {name} · {role === "ADMIN" ? "Admin" : "Cliente"}
          </span>
          <Button variant="inverse" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
            Salir
          </Button>
          <Button
            type="button"
            variant="inverse"
            size="icon"
            className="lg:hidden"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {open ? (
        <nav className="border-t border-white/15 bg-navy px-4 py-3 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2 text-[0.8125rem] font-medium tracking-[-0.011em] text-white/70 hover:bg-white/10 hover:text-white",
                    active && "bg-white/10 text-white",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
      <div className="h-0.5 bg-lima" aria-hidden />
    </header>
  );
}
