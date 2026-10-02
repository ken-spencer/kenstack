import AuthGuard from "@kenstack/auth/components/AuthGuard";
import type { DefinedAdmin } from "@kenstack/admin/module";

import ModuleSettingsControlClient from "./ControlClient";

type ModuleSettingsControlProps = {
  children: React.ReactNode;
  description?: string;
  label?: string;
  module: DefinedAdmin[string];
  title: string;
};

export default async function ModuleSettingsControl({
  children,
  description,
  label,
  module,
  title,
}: ModuleSettingsControlProps) {
  if (!module.settings || !module.client) {
    return children;
  }

  return (
    <AuthGuard access="admin" fallback={children}>
      <ModuleSettingsControlClient
        clients={module.client}
        description={description}
        label={label ?? `Edit ${title} settings`}
        name={module.name}
        title={title}
      >
        {children}
      </ModuleSettingsControlClient>
    </AuthGuard>
  );
}
