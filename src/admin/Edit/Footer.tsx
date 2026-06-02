"use client";
import { useAdminEdit } from "./context";
import MetaDates from "../components/MetaDates";
import NeighborButtons from "./NeighborButtons";

export default function AdminEditFooter() {
  const { item } = useAdminEdit();
  return (
    <div className="flex items-center justify-between gap-4 border-t py-2">
      {item && (
        <MetaDates createdAt={item.createdAt} updatedAt={item.updatedAt} />
      )}
      <NeighborButtons />
    </div>
  );
}
