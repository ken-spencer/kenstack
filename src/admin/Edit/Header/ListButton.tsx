"use client";

import { List } from "lucide-react";
import { useSearchParams } from "next/navigation";
import FormNavButton from "@kenstack/forms/NavButton";
import { useAdminEdit } from "../context";

export default function ListButton() {
  const searchParams = useSearchParams();
  const { listPath, single } = useAdminEdit();

  if (single) {
    return null;
  }

  return (
    <FormNavButton
      href={listPath + (searchParams.size ? "?" + searchParams : "")}
      size="icon"
      tooltip="Go To List"
      variant="ghost"
    >
      <List className="text-foreground size-6" />
    </FormNavButton>
  );
}
