import AuthGuard from "@kenstack/auth/components/AuthGuard";
import type { AdminClientRegistry } from "@kenstack/admin/clientLoaders";
import type { DefinedAdmin } from "@kenstack/admin/module";

import ModuleSettingsControlClient from "./ControlClient";

type ModuleSettingsControlProps = {
  children: React.ReactNode;
  description?: string;
  label?: string;
  module: DefinedAdmin[string];
  title: string;
};

export default async function ModuleSettingsControl(
  props: ModuleSettingsControlProps,
) {
  if (!props.module.settings || !props.module.client) {
    return props.children;
  }

  return (
    <AuthGuard access="admin" fallback={props.children}>
      <ModuleSettingsControlContent {...props} clients={props.module.client} />
    </AuthGuard>
  );
}

function ModuleSettingsControlContent({
  children,
  clients,
  description,
  label,
  module,
  title,
}: ModuleSettingsControlProps & { clients: AdminClientRegistry }) {
  return (
    <ModuleSettingsControlClient
      clients={clients}
      description={description}
      label={label ?? `Edit ${title} settings`}
      name={module.name}
      title={title}
    >
      {children}
    </ModuleSettingsControlClient>
  );
}
