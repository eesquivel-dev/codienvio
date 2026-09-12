"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

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
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href={role === "ADMIN" ? "/admin" : "/portal"} className="flex items-center gap-2 font-semibold">
            <Package className="h-5 w-5 text-primary" />
            CodiEnvio
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
                  pathname === item.href && "bg-accent text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {name} · {role === "ADMIN" ? "Admin" : "Cliente"}
          </span>
          <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
            Salir
          </Button>
        </div>
      </div>
    </header>
  );
}
