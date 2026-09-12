import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { auth } from "@/lib/auth";
import { getBrandLogoSrc } from "@/lib/brand-assets";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gris-papel">
      <AppHeader
        name={session.user.name}
        role="CLIENT"
        logoSrc={getBrandLogoSrc("onNavy")}
        items={[
          { href: "/portal", label: "Cotizar" },
          { href: "/portal/envios", label: "Mis envíos" },
          { href: "/docs", label: "API" },
        ]}
      />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
