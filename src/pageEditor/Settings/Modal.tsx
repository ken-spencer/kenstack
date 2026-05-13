"use client";

import { useLayoutEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@kenstack/components/ui/dialog";
import { useAdminUi } from "@kenstack/hooks/useAdminUi";

import { Pencil, Settings } from "lucide-react";
import Form from "./Form";

export default function PageEditSettingsModal() {
  const { editing, setCanEdit, setEditing } = useAdminUi();

  useLayoutEffect(() => {
    setCanEdit(true);
  }, [setCanEdit]);

  return (
    <>
      <Dialog>
        <DialogTrigger
          aria-label="Edit page settings"
          title="Edit page settings"
          className="fixed top-20 right-4 z-40 flex size-8 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow ring-1 ring-black/10 transition hover:bg-white hover:text-gray-950 focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:outline-none dark:bg-gray-950/90 dark:text-gray-200 dark:ring-white/15 dark:hover:bg-gray-950"
        >
          <Settings className="size-4" />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Page Settings</DialogTitle>
            <DialogDescription>Manage page search metadata.</DialogDescription>
          </DialogHeader>
          <Form />
        </DialogContent>
      </Dialog>

      <button
        type="button"
        aria-label={
          editing ? "Disable inline editing" : "Enable inline editing"
        }
        aria-pressed={editing}
        title={editing ? "Disable inline editing" : "Enable inline editing"}
        className={
          "fixed top-30 right-4 z-40 flex size-8 items-center justify-center rounded-full shadow ring-1 transition focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:outline-none " +
          (editing
            ? "bg-fuchsia-800/85 text-white ring-fuchsia-800/60 hover:bg-fuchsia-800"
            : "bg-white/90 text-gray-700 ring-black/10 hover:bg-white hover:text-gray-950 dark:bg-gray-950/90 dark:text-gray-200 dark:ring-white/15 dark:hover:bg-gray-950")
        }
        onClick={() => {
          setEditing(!editing);
        }}
      >
        <Pencil className="size-3.5" />
      </button>
    </>
  );
}
