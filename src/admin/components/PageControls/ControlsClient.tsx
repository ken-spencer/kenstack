"use client";

import { Eye, Pencil, Settings } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@kenstack/lib/utils";
import { draftModePath } from "@kenstack/admin/lib/searchParams";
import { useAdminUi } from "./useAdminUi";

const buttonClassName =
  "flex size-8 items-center justify-center rounded-full shadow ring-1 transition focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:outline-none";
const inactiveButtonClassName =
  "bg-white/90 text-gray-700 ring-black/10 hover:bg-white hover:text-gray-950 dark:bg-gray-950/90 dark:text-gray-200 dark:ring-white/15 dark:hover:bg-gray-950";

type PageControlsProps = {
  className?: string;
  draftModeEnabled: boolean;
};

export default function PageControlsClient({
  className,
  draftModeEnabled,
}: PageControlsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    hasAdminControl,
    pageSettingsAction,
    showAdminControls,
    setShowAdminControls,
  } = useAdminUi();
  const query = searchParams.toString();
  const currentPath = `${pathname}${query ? `?${query}` : ""}`;
  const adminControlsLabel = showAdminControls
    ? "Hide admin controls"
    : "Show admin controls";
  const draftToggleLabel = draftModeEnabled
    ? "Exit draft mode"
    : "Enter draft mode";
  const showDraftToggle =
    draftModeEnabled || (hasAdminControl && showAdminControls);
  const showPageSettings = hasAdminControl && showAdminControls;

  return (
    <div
      className={cn("fixed top-20 right-4 z-40 flex flex-col gap-2", className)}
    >
      {hasAdminControl ? (
        <button
          type="button"
          aria-label={adminControlsLabel}
          aria-pressed={showAdminControls}
          title={adminControlsLabel}
          className={cn(
            buttonClassName,
            showAdminControls
              ? "bg-fuchsia-800/85 text-white ring-fuchsia-800/60 hover:bg-fuchsia-800"
              : inactiveButtonClassName,
          )}
          onClick={() => {
            setShowAdminControls(!showAdminControls);
          }}
        >
          <Pencil className="size-3.5" />
        </button>
      ) : null}

      {showDraftToggle ? (
        <a
          href={draftModePath(
            draftModeEnabled ? "disable-draft" : "enable-draft",
            currentPath,
          )}
          role="button"
          aria-label={draftToggleLabel}
          aria-pressed={draftModeEnabled}
          title={draftToggleLabel}
          className={cn(
            buttonClassName,
            draftModeEnabled
              ? "bg-amber-500/90 text-white ring-amber-500/60 hover:bg-amber-500"
              : inactiveButtonClassName,
          )}
        >
          <Eye className="size-4" />
        </a>
      ) : null}

      {showPageSettings && pageSettingsAction ? (
        <button
          type="button"
          aria-label="Edit page settings"
          title="Edit page settings"
          className={cn(buttonClassName, inactiveButtonClassName)}
          onClick={pageSettingsAction}
        >
          <Settings className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
