"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@kenstack/components/ui/dialog";
import { useAdminUi } from "@kenstack/admin/components/PageControls/useAdminUi";

import Form from "./Form";

export default function PageEditSettingsModal() {
  const { showAdminControls } = useAdminUi();

  if (!showAdminControls) {
    return null;
  }

  return <PageEditSettingsButton />;
}

function PageEditSettingsButton() {
  const [open, setOpen] = useState(false);
  const portalTarget =
    typeof document === "undefined"
      ? null
      : document.getElementById("kenstack-page-controls");

  return (
    <>
      {portalTarget
        ? createPortal(
            <button
              type="button"
              aria-label="Edit page settings"
              title="Edit page settings"
              className="flex size-8 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow ring-1 ring-black/10 transition hover:bg-white hover:text-gray-950 focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:outline-none dark:bg-gray-950/90 dark:text-gray-200 dark:ring-white/15 dark:hover:bg-gray-950"
              onClick={() => {
                setOpen(true);
              }}
            >
              <Settings className="size-4" />
            </button>,
            portalTarget,
          )
        : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Page Settings</DialogTitle>
            <DialogDescription>
              Manage page search and sharing metadata.
            </DialogDescription>
          </DialogHeader>
          <Form />
        </DialogContent>
      </Dialog>
    </>
  );
}
