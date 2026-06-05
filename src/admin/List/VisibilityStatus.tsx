"use client";

import { visibilityStatusOptions } from "@kenstack/admin/lib/visibilityStatus";
import type { VisibilityValue } from "@kenstack/admin/lib/visibility";
import { cn } from "@kenstack/lib/utils";

const statusClassNames = {
  draft: "border-gray-200 text-gray-600",
  published: "border-fuchsia-800/30 text-fuchsia-900",
  unlisted: "border-gray-200 text-gray-600",
} satisfies Record<VisibilityValue, string>;

type VisibilityStatusProps = {
  className?: string;
  item: Record<string, unknown>;
};

export default function VisibilityStatus({
  className,
  item,
}: VisibilityStatusProps) {
  const option =
    typeof item.visibility === "string"
      ? visibilityStatusOptions.find(
          (status) => status.value === item.visibility,
        )
      : undefined;

  if (!option) {
    return null;
  }

  const { icon: Icon, label, value } = option;

  return (
    <div
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded border text-xs sm:w-auto sm:gap-1.5 sm:px-2",
        statusClassNames[value],
        className,
      )}
    >
      <Icon className="size-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}
