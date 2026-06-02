"use client";

import { List } from "lucide-react";
import { useSearchParams } from "next/navigation";
import AdminEditNavButton from "../AdminEditNavButton";
import { useAdminEdit } from "../context";

export default function ListButton() {
  const searchParams = useSearchParams();
  const { listPath, single } = useAdminEdit();

  if (single) {
    return null;
  }

  return (
    <AdminEditNavButton
      href={listPath + (searchParams.size ? "?" + searchParams : "")}
      tooltip="Go To List"
    >
      <List className="size-6 text-gray-800" />
    </AdminEditNavButton>
  );
}
