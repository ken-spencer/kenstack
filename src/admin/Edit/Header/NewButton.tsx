"use client";

import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import AdminEditNavButton from "../AdminEditNavButton";
import { useAdminEdit } from "../context";

export default function NewButton() {
  const searchParams = useSearchParams();
  const { listPath, single } = useAdminEdit();

  if (single) {
    return null;
  }

  return (
    <AdminEditNavButton
      href={listPath + "/new" + (searchParams.size ? "?" + searchParams : "")}
      tooltip="New Entry"
    >
      <Plus className="size-6 text-gray-800" />
    </AdminEditNavButton>
  );
}
