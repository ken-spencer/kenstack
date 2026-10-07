"use client";

import { use, useState } from "react";
import { Settings } from "lucide-react";

import { useAdminControl } from "@kenstack/admin/components/PageControls/useAdminUi";
import { cn } from "@kenstack/lib/utils";
import type { ModuleClient } from "@kenstack/admin/client";
import { loadSettingsClient } from "@kenstack/admin/clientLoaders";

import ModuleSettingsModal from "./Modal";

type ModuleSettingsControlClientProps = {
  children: React.ReactNode;
  client: ModuleClient;
  description?: string;
  label: string;
  name: string;
  title: string;
};

export default function ModuleSettingsControlClient({
  children,
  client,
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

  if (!client.settings) {
    return children;
  }

  const settings = use(loadSettingsClient(client.settings));

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
