import { getAdminSettingsView } from "@/app/admin/actions";
import { SettingsForm } from "@/app/admin/settings-form";
import { PageHeader } from "@/components/page-header";

export default async function AdminSettingsPage() {
  const settings = await getAdminSettingsView();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Token de Envia, ambiente sandbox/producción y comisión global. Los secretos nunca salen al navegador en texto plano después de guardarse."
      />
      <SettingsForm settings={settings} />
    </div>
  );
}
