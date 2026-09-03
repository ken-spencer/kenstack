import { Pencil } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { deps } from "@app/deps";

export default function ComposerToolbar({ editHref }: { editHref: string }) {
  return (
    <Suspense fallback={null}>
      <ComposerToolbarContent editHref={editHref} />
    </Suspense>
  );
}

async function ComposerToolbarContent({ editHref }: { editHref: string }) {
  if (!(await deps.auth.hasAccess("admin"))) {
    return null;
  }

  return (
    <nav aria-label="Composer controls" className="fixed top-24 right-4 z-40">
      <Link
        aria-label="Edit page"
        className="bg-card/90 text-card-foreground ring-border hover:bg-card hover:text-foreground focus-visible:ring-ring flex size-8 items-center justify-center rounded-full shadow ring-1 transition focus-visible:ring-2 focus-visible:outline-none"
        href={editHref}
        title="Edit page"
      >
        <Pencil className="size-3.5" />
      </Link>
    </nav>
  );
}
