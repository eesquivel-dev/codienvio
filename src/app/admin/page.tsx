import { getAdminSettingsView } from "@/app/admin/actions";
import { SettingsForm } from "@/app/admin/settings-form";
import { PageHeading } from "@/components/page-heading";

export default async function AdminPage() {
  const settings = await getAdminSettingsView();
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Administración"
        title="Configuración"
        description="Token de Envia, ambiente y comisión global. Los secretos nunca salen al navegador en texto plano después de guardarse."
      />
      <SettingsForm settings={settings} />
    </div>
  );
}
