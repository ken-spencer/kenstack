"use client";

import IconButton from "@kenstack/components/IconButton";
import { Eye } from "lucide-react";
import { draftModePath } from "@kenstack/admin/lib/searchParams";
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
    ? draftModePath("enable-draft", previewPath)
    : undefined;

  if (!previewUrl || isNew || isDeleted) {
    return null;
  }

  return (
    <IconButton tooltip="View Content" asChild>
      <a href={previewUrl} target="_blank" rel="noreferrer">
        <Eye className="size-6 text-gray-800" />
      </a>
    </IconButton>
  );
}
