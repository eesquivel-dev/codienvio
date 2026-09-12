"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

export function AppHeader({
  name,
  role,
  items,
  logoSrc,
}: {
  name?: string | null;
  role: "ADMIN" | "CLIENT";
  items: NavItem[];
  logoSrc?: string | null;
}) {
  const pathname = usePathname();
  const home = role === "ADMIN" ? "/admin" : "/portal";
  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <BrandMark href={home} variant="onNavy" compact src={logoSrc} />
          <nav className="hidden items-center gap-1 sm:flex">
            {items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white",
                    active && "bg-white/10 font-medium text-lima",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-gris-azulado sm:inline">
            {name} · {role === "ADMIN" ? "Admin" : "Cliente"}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Salir
          </Button>
        </div>
      </div>
      <div className="h-0.5 bg-lima" aria-hidden />
    </header>
  );
}
