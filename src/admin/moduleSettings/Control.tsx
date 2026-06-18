import AuthGuard from "@kenstack/auth/components/AuthGuard";
import type { ClientConfig } from "@kenstack/admin/client";
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

  const client = await props.module.client();

  return (
    <AuthGuard access="admin" fallback={props.children}>
      <ModuleSettingsControlContent {...props} client={client} />
    </AuthGuard>
  );
}

function ModuleSettingsControlContent({
  children,
  client,
  description,
  label,
  module,
  title,
}: ModuleSettingsControlProps & { client: ClientConfig }) {
  return (
    <ModuleSettingsControlClient
      client={client}
      description={description}
      label={label ?? `Edit ${title} settings`}
      name={module.name}
      title={title}
    >
      {children}
    </ModuleSettingsControlClient>
  );
}
