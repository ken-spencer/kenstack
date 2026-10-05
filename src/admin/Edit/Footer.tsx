"use client";
import { useWatch } from "react-hook-form";
import { useAdminEdit } from "./context";
import MetaDates from "../components/MetaDates";
import NeighborButtons from "./NeighborButtons";

export default function AdminEditFooter() {
  const { item } = useAdminEdit();
  // The form's values carry the record's token, which moves on with each save.
  const updatedAt = useWatch({ name: "updatedAt" });
  return (
    <div className="border-border flex items-center justify-between gap-4 border-t pb-2">
      {item && <MetaDates record={{ ...item, updatedAt }} />}
      <NeighborButtons />
    </div>
  );
}
