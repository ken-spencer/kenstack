"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [open, setOpen] = useState(false);
  const { clearPageSettingsAction, setPageSettingsAction } = useAdminUi();
  const openPageSettings = useCallback(() => {
    setOpen(true);
  }, []);

  useEffect(() => {
    setPageSettingsAction(openPageSettings);

    return () => {
      clearPageSettingsAction(openPageSettings);
    };
  }, [clearPageSettingsAction, openPageSettings, setPageSettingsAction]);

  return (
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
  );
}
