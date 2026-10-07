/*
 * Public entry point: the editor's footer bar, which a module's own Edit passes to AdminEdit as
 * `footer` with the parts it wants, such as RecordDates. Exports only EditFooter.
 */

import type { ReactNode } from "react";

export default function EditFooter({ children }: { children?: ReactNode }) {
  return (
    <div className="border-border flex items-center justify-between gap-4 border-t pb-2">
      {children}
    </div>
  );
}
