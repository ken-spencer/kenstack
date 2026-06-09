"use client";

import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import FormNavButton from "@kenstack/forms/NavButton";
import { useAdminEdit } from "../context";

export default function NewButton() {
  const searchParams = useSearchParams();
  const { listPath, single } = useAdminEdit();

  if (single) {
    return null;
  }

  return (
    <FormNavButton
      href={listPath + "/new" + (searchParams.size ? "?" + searchParams : "")}
      size="icon"
      tooltip="New Entry"
      variant="ghost"
    >
      <Plus className="size-6 text-gray-800" />
    </FormNavButton>
  );
}
