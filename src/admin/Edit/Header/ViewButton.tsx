"use client";

/*
 * Public entry point: the editor's link to the record's own page, for a module whose host mounts a
 * read-only view at /admin/<name>/<id>. Exports only ViewButton.
 */

import { Eye } from "lucide-react";
import { useSearchParams } from "next/navigation";
import FormNavButton from "@kenstack/forms/NavButton";
import { useAdminEdit } from "../context";

export default function ViewButton() {
  const searchParams = useSearchParams();
  const { id, name } = useAdminEdit();

  // A new record has no page yet.
  if (id === undefined) {
    return null;
  }

  return (
    <FormNavButton
      href={
        `/admin/${name}/${id}` + (searchParams.size ? "?" + searchParams : "")
      }
      aria-label="View"
      size="icon"
      tooltip="View"
      variant="ghost"
    >
      <Eye className="text-foreground size-6" />
    </FormNavButton>
  );
}
