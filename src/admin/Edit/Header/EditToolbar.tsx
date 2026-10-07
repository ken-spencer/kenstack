/*
 * Public entry point: the editor's toolbar, which a module's own Edit passes to AdminEdit as
 * `toolbar`, leading with its children and ending with `end`. Exports only EditToolbar.
 */

import type { ReactNode } from "react";

export default function EditToolbar({
  children,
  end,
}: {
  children?: ReactNode;
  end?: ReactNode;
}) {
  // Pinned so Save stays reachable at the end of a long form; breadcrumbs
  // above it scroll away.
  return (
    <div className="bg-background sticky top-0 z-20 flex gap-4 border-b border-b-[var(--admin-divider)]">
      <div className="flex grow items-center gap-1">{children}</div>
      <div className="flex gap-1">{end}</div>
    </div>
  );
}
