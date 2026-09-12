import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { auth } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <AppHeader
        name={session.user.name}
        role="ADMIN"
        items={[
          { href: "/admin", label: "Panel" },
          { href: "/admin/configuracion", label: "Configuración" },
          { href: "/admin/clientes", label: "Clientes" },
          { href: "/admin/envios", label: "Envíos" },
          { href: "/docs", label: "API" },
        ]}
      />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
