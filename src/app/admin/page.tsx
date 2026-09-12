import { getAdminSettingsView } from "@/app/admin/actions";
import { SettingsForm } from "@/app/admin/settings-form";

export default async function AdminPage() {
  const settings = await getAdminSettingsView();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Token de Envia, ambiente y comisión global. Los secretos nunca salen al navegador en
          texto plano después de guardarse.
        </p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
