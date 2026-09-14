import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { auth } from "@/lib/auth";
import { formatMxn } from "@/lib/money";
import { getClientWallet } from "@/lib/wallet";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENT" || !session.user.clientId) {
    redirect("/login");
  }

  const wallet = await getClientWallet(session.user.clientId);

  return (
    <div className="min-h-screen bg-papel">
      <AppHeader
        name={session.user.name}
        role="CLIENT"
        balanceLabel={formatMxn(wallet.balanceMxn)}
        items={[
          { href: "/portal", label: "Inicio" },
          { href: "/portal/saldo", label: "Saldo" },
          { href: "/portal/libreta", label: "Libreta" },
          { href: "/portal/envios", label: "Mis envíos" },
          { href: "/rastreo", label: "Rastreo" },
          { href: "/docs", label: "API" },
        ]}
      />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
