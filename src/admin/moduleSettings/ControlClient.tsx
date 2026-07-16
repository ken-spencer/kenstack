"use client";

import { use, useState } from "react";
import { Settings } from "lucide-react";

import { useAdminControl } from "@kenstack/admin/components/PageControls/useAdminUi";
import { cn } from "@kenstack/lib/utils";
import type { AdminClientRegistry } from "@kenstack/admin/clientLoaders";

import ModuleSettingsModal from "./Modal";

type ModuleSettingsControlClientProps = {
  children: React.ReactNode;
  clients: AdminClientRegistry;
  description?: string;
  label: string;
  name: string;
  title: string;
};

export default function ModuleSettingsControlClient({
  children,
  clients,
  description,
  label,
  name,
  title,
}: ModuleSettingsControlClientProps) {
  const [open, setOpen] = useState(false);
  const { showAdminControls } = useAdminControl();

  if (!showAdminControls) {
    return children;
  }

  const loadClientConfig = clients[name];

  if (!loadClientConfig) {
    return children;
  }

  const client = use(loadClientConfig());
  const settings = client.settings;

  if (!settings) {
    return children;
  }

  return (
    <div className="relative">
      {children}
      <button
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          "bg-card/85 text-card-foreground ring-border hover:text-foreground focus-visible:ring-ring absolute -top-3 right-0 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full shadow ring-1 transition focus-visible:ring-2 focus-visible:outline-none sm:-right-6 sm:bg-transparent sm:shadow-none sm:ring-0",
        )}
        onClick={() => {
          setOpen(true);
        }}
      >
        <Settings className="size-3.5" />
      </button>
      <ModuleSettingsModal
        client={settings}
        description={description}
        name={name}
        open={open}
        onOpenChange={setOpen}
        title={title}
      />
    </div>
  );
}
