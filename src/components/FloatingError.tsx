import type { ReactNode } from "react";
import { CircleAlert, X } from "lucide-react";

export default function FloatingError({
  dismissLabel = "Dismiss",
  message,
  onDismiss,
}: {
  dismissLabel?: string;
  message: ReactNode;
  onDismiss: () => void;
}) {
  return (
    <div
      className="fixed right-4 bottom-4 z-50 flex min-h-36 w-64 max-w-[calc(100vw-2rem)] gap-3 rounded-md bg-red-600 p-4 text-sm text-white shadow-lg"
      role="alert"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      <div className="grow">{message}</div>
      <button
        aria-label={dismissLabel}
        className="-m-1 flex size-6 shrink-0 items-center justify-center rounded-sm text-white/80 transition hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        type="button"
        onClick={onDismiss}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
