"use client";

import { ArchiveRestore, Recycle } from "lucide-react";

import Button from "@kenstack/components/Button";
import { useAdminList } from "./context";

export default function TrashToggle() {
  const { filters, setFilters, setSelected, sort } = useAdminList();
  const inTrash = filters.trash;
  const defaultSort = sort.find((option) => option.name !== "deletedAt");

  return (
    <Button
      size="icon"
      type="button"
      tooltip={inTrash ? "Exit Trash" : "View Trash"}
      variant="ghost"
      onClick={() => {
        setSelected([]);
        setFilters((prev) => {
          const filters = { ...prev.filters };
          if (prev.trash) {
            delete filters.deletedAt;
          }

          if (prev.trash && prev.sort === "deletedAt") {
            return {
              ...prev,
              filters,
              sort: defaultSort?.name ?? "createdAt",
              direction: defaultSort?.defaultDirection ?? "desc",
              trash: false,
            };
          }

          return { ...prev, filters, trash: !prev.trash };
        }, false);
      }}
    >
      {inTrash ? (
        <ArchiveRestore className="size-6 text-gray-800" />
      ) : (
        <Recycle className="size-6 text-gray-800" />
      )}
    </Button>
  );
}
