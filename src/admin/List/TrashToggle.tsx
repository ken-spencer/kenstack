"use client";

import { ArchiveRestore, Recycle } from "lucide-react";

import IconButton from "@kenstack/components/IconButton";
import { useAdminList } from "./context";

export default function TrashToggle() {
  const { filters, setFilters, setSelected } = useAdminList();
  const inTrash = filters.trash;

  return (
    <IconButton
      type="button"
      tooltip={inTrash ? "Exit Trash" : "View Trash"}
      onClick={() => {
        setSelected([]);
        setFilters((prev) => ({ ...prev, trash: !prev.trash }), false);
      }}
    >
      {inTrash ? (
        <ArchiveRestore className="size-6 text-gray-800" />
      ) : (
        <Recycle className="size-6 text-gray-800" />
      )}
    </IconButton>
  );
}
