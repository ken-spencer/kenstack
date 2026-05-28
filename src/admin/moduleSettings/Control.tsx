import AuthGuard from "@kenstack/auth/components/AuthGuard";
import type { SettingsClient } from "@kenstack/admin/client";

import ModuleSettingsControlClient from "./ControlClient";

type ModuleSettingsControlProps = {
  children: React.ReactNode;
  client?: SettingsClient;
  description?: string;
  label?: string;
  name: string;
  title: string;
};

export default function ModuleSettingsControl(props: ModuleSettingsControlProps) {
  if (!props.client) {
    return props.children;
  }

  return (
    <AuthGuard access="admin" fallback={props.children}>
      <ModuleSettingsControlContent {...props} client={props.client} />
    </AuthGuard>
  );
}

function ModuleSettingsControlContent({
  children,
  client,
  description,
  label,
  name,
  title,
}: ModuleSettingsControlProps & { client: SettingsClient }) {
  return (
    <ModuleSettingsControlClient
      client={client}
      description={description}
      label={label ?? `Edit ${title} settings`}
      name={name}
      title={title}
    >
      {children}
    </ModuleSettingsControlClient>
  );
}
