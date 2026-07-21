"use client";
import { useAdminEdit } from "./context";
import MetaDates from "../components/MetaDates";
import NeighborButtons from "./NeighborButtons";

export default function AdminEditFooter() {
  const { item } = useAdminEdit();
  return (
    <div className="border-border flex items-center justify-between gap-4 border-t pb-2">
      {item && <MetaDates record={item} />}
      <NeighborButtons />
    </div>
  );
}
