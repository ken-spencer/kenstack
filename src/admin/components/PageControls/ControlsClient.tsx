"use client";

import { Pencil } from "lucide-react";

import { cn } from "@kenstack/lib/utils";
import { useAdminUi } from "./useAdminUi";

type PageControlsProps = {
  className?: string;
};

export default function PageControlsClient({ className }: PageControlsProps) {
  const {
    hasAdminControl,
    showAdminControls,
    setShowAdminControls,
  } = useAdminUi();

  return (
    <>
      <div
        className={cn(
          "fixed top-20 right-4 z-40 flex flex-col gap-2",
          className,
        )}
      >
        {hasAdminControl ? (
          <button
            type="button"
            aria-label={
              showAdminControls ? "Hide admin controls" : "Show admin controls"
            }
            aria-pressed={showAdminControls}
            title={
              showAdminControls ? "Hide admin controls" : "Show admin controls"
            }
            className={
              "flex size-8 items-center justify-center rounded-full shadow ring-1 transition focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:outline-none " +
              (showAdminControls
                ? "bg-fuchsia-800/85 text-white ring-fuchsia-800/60 hover:bg-fuchsia-800"
                : "bg-white/90 text-gray-700 ring-black/10 hover:bg-white hover:text-gray-950 dark:bg-gray-950/90 dark:text-gray-200 dark:ring-white/15 dark:hover:bg-gray-950")
            }
            onClick={() => {
              setShowAdminControls(!showAdminControls);
            }}
          >
            <Pencil className="size-3.5" />
          </button>
        ) : null}

        <div id="kenstack-page-controls" className="contents" />
      </div>
    </>
  );
}
