"use client";
import { useAdminEdit } from "./context";
import MetaDates from "../MetaDates";

export default function AdminEditFooter() {
  const { item } = useAdminEdit();
  return (
    <div className="border-t py-2">
      {item && (
        <MetaDates createdAt={item.createdAt} updatedAt={item.updatedAt} />
      )}
    </div>
  );
}
