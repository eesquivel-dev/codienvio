"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, X } from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
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
}: {
  name?: string | null;
  role: "ADMIN" | "CLIENT";
  items: NavItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const home = role === "ADMIN" ? "/admin" : "/portal";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-card/95 backdrop-blur",
        role === "ADMIN" && "border-b-primary/25",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-6">
          <Link href={home} className="shrink-0" onClick={() => setOpen(false)}>
            <BrandLockup subtitle={role === "ADMIN" ? "Administración" : "Portal de clientes"} />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
                  isActive(pathname, item.href) && "bg-accent font-medium text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="max-w-[10rem] truncate text-sm text-muted-foreground">{name}</span>
            <Badge variant={role === "ADMIN" ? "default" : "secondary"}>
              {role === "ADMIN" ? "Admin" : "Cliente"}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
            Salir
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {open ? (
        <nav className="border-t bg-card px-4 py-3 md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
                  isActive(pathname, item.href) && "bg-accent font-medium text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
