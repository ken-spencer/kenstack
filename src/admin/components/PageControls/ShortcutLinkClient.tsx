"use client";

import Link from "next/link";

import { useAdminControl } from "./useAdminUi";
import { cn } from "@kenstack/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@kenstack/components/ui/tooltip";

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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={href}
            aria-label={label}
            className={cn(
              "absolute -top-3 right-0 z-10 size-6 cursor-pointer rounded-full bg-white/85 text-center leading-6 text-gray-700 shadow ring-1 ring-black/10 transition hover:text-gray-950 focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:outline-none sm:-right-6 sm:bg-transparent sm:shadow-none sm:ring-0 dark:bg-gray-950/85 sm:dark:bg-transparent",
              className,
            )}
          >
            ✎
          </Link>
        </TooltipTrigger>
        <TooltipContent side="left">Edit</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
