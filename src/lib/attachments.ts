import { File } from "lucide-react";
import type { ComponentProps, ElementType } from "react";

import FileDoc from "@kenstack/icons/FileDoc";
import FileDocx from "@kenstack/icons/FileDocx";
import FilePdf from "@kenstack/icons/FilePdf";

export type AttachmentUploadState = "pending" | "uploading" | "done" | "error";

export const attachmentUploadStatusLabels = {
  error: "Upload failed",
  pending: "Waiting",
  uploading: "Uploading",
} satisfies Partial<Record<AttachmentUploadState, string>>;

type AttachmentDocumentMeta = {
  className: string;
  icon: ElementType<ComponentProps<"svg">>;
  label: string;
};

export function getAttachmentDocumentMeta(
  sourceType?: string | null,
): AttachmentDocumentMeta {
  switch (sourceType) {
    case "application/pdf":
      return {
        icon: FilePdf,
        label: "PDF",
        className:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300",
      };
    case "application/msword":
      return {
        icon: FileDoc,
        label: "DOC",
        className:
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300",
      };
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return {
        icon: FileDocx,
        label: "DOCX",
        className:
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300",
      };
    default:
      return {
        icon: File,
        label: "File",
        className:
          "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300",
      };
  }
}
