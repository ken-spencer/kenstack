"use client";

import IconButton from "@kenstack/components/IconButton";
import { ScanEye } from "lucide-react";
import { useAdminEdit } from "../context";

export default function PreviewButton() {
  const { preview, isNew, item } = useAdminEdit();
  const isDeleted = !!item?.deletedAt;
  const previewPath =
    preview && item
      ? preview.replace(/\${(.*?)}/g, (_, key) =>
          typeof item[key] === "string" || typeof item[key] === "number"
            ? String(item[key])
            : "",
        )
      : undefined;
  const previewUrl = previewPath
    ? `${previewPath}${previewPath.includes("?") ? "&" : "?"}preview`
    : undefined;

  if (!previewUrl || isNew || isDeleted) {
    return null;
  }

  return (
    <IconButton
      type="button"
      tooltip="View Content"
      onClick={() => window.open(previewUrl, "_blank")}
    >
      <ScanEye className="size-6 text-gray-800" />
    </IconButton>
  );
}
