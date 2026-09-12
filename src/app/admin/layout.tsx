import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ADMIN_NAV } from "@/lib/admin-nav";
import { auth } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-papel">
      <AppHeader
        name={session.user.name}
        role="ADMIN"
        items={[...ADMIN_NAV]}
      />
      <div className="mx-auto max-w-7xl px-4 py-8">{children}</div>
    </div>
  );
}
