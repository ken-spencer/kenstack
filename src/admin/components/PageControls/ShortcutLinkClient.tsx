"use client";

import Link from "next/link";

import { useAdminControl } from "./useAdminUi";
import { cn } from "@kenstack/lib/utils";

type ShortcutLinkClientProps = {
  href: string;
  label: string;
  className?: string;
};

export default function ShortcutLinkClient({
  href,
  label,
  className,
}: ShortcutLinkClientProps) {
  const { showAdminControls } = useAdminControl();

  if (!showAdminControls) {
    return null;
  }

  return (
    <Link
      href={href}
      aria-label={label}
      title="Edit"
      className={cn(
        "bg-card/85 text-card-foreground ring-border hover:text-foreground focus-visible:ring-ring absolute -top-3 right-0 z-10 size-6 cursor-pointer rounded-full text-center leading-6 shadow ring-1 transition focus-visible:ring-2 focus-visible:outline-none sm:-right-6 sm:bg-transparent sm:shadow-none sm:ring-0",
        className,
      )}
    >
      ✎
    </Link>
  );
}
