"use client";

import { useState } from "react";
import { Download, ExternalLink, X } from "lucide-react";
import { twMerge } from "tailwind-merge";

import ProgressIcon from "@kenstack/icons/Progress";
import type { SelectedMedia } from "@kenstack/db/tables";
import {
  attachmentUploadStatusLabels,
  getAttachmentDocumentMeta,
  type AttachmentUploadState,
} from "@kenstack/lib/attachments";
import { formatFileSize } from "@kenstack/lib/fileSize";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@kenstack/components/Dialog";

export type AttachmentListItem = {
  alt?: SelectedMedia["alt"];
  filename?: SelectedMedia["filename"];
  id?: SelectedMedia["id"];
  kind?: SelectedMedia["kind"] | null;
  originalUrl?: SelectedMedia["originalUrl"];
  sourceSize?: SelectedMedia["sourceSize"];
  sourceType?: SelectedMedia["sourceType"];
  title?: SelectedMedia["title"];
  url?: SelectedMedia["url"];
  uploadState?: AttachmentUploadState;
};

function AttachmentIcon({ media }: { media: AttachmentListItem }) {
  if (media.kind !== "file") {
    return (
      <span className="block size-10 shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900">
        {media.url ? (
          <img alt="" className="h-full w-full object-cover" src={media.url} />
        ) : null}
      </span>
    );
  }

  const { className, icon: Icon } = getAttachmentDocumentMeta(media.sourceType);

  return (
    <span
      className={twMerge(
        "flex size-10 shrink-0 items-center justify-center rounded border",
        className,
      )}
    >
      <Icon className="size-5" />
    </span>
  );
}

export default function AttachmentList({
  attachments,
  className,
  itemClassName,
  onRemove,
}: {
  attachments: AttachmentListItem[];
  className?: string;
  itemClassName?: string;
  onRemove?: (index: number) => void;
}) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const previewMedia =
    previewIndex !== null ? attachments[previewIndex] : undefined;

  if (!attachments.length) {
    return null;
  }

  return (
    <>
      <ul className={twMerge("space-y-1.5", className)}>
        {attachments.map((attachment, index) => {
          const fileMedia = attachment.kind === "file";
          const fileHref = fileMedia ? (attachment.url ?? "") : "";
          const status =
            attachment.uploadState && attachment.uploadState !== "done"
              ? attachmentUploadStatusLabels[attachment.uploadState]
              : null;
          const fileSize = formatFileSize(attachment.sourceSize);
          const { label } = getAttachmentDocumentMeta(attachment.sourceType);
          const kindLabel = fileMedia ? label : "Image";
          const isPdf = attachment.sourceType === "application/pdf";
          const content = (
            <>
              <AttachmentIcon media={attachment} />
              <span className="min-w-0 flex-1 text-left">
                <span className="line-clamp-2 text-sm leading-snug font-medium break-all text-gray-800 dark:text-gray-100">
                  {attachment.filename || attachment.title || kindLabel}
                </span>
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  {status ? (
                    <>
                      {status === "Uploading" ? (
                        <ProgressIcon className="size-3 animate-spin" />
                      ) : null}
                      {status}
                    </>
                  ) : (
                    [kindLabel, fileSize].filter(Boolean).join(" · ")
                  )}
                </span>
              </span>
              {fileMedia && fileHref && !status ? (
                isPdf ? (
                  <ExternalLink className="text-muted-foreground size-4 shrink-0" />
                ) : (
                  <Download className="text-muted-foreground size-4 shrink-0" />
                )
              ) : null}
            </>
          );

          return (
            <li
              className={twMerge(
                "flex items-center gap-2 rounded-md border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-950",
                attachment.uploadState === "error" && "opacity-60",
                itemClassName,
              )}
              key={
                attachment.id ??
                attachment.url ??
                attachment.originalUrl ??
                index
              }
            >
              {fileMedia ? (
                fileHref && !status ? (
                  <a
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[#245f93]/35"
                    download={isPdf ? undefined : attachment.filename || true}
                    href={fileHref}
                    rel={isPdf ? "noreferrer" : undefined}
                    target={isPdf ? "_blank" : undefined}
                  >
                    {content}
                  </a>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {content}
                  </div>
                )
              ) : (
                <button
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[#245f93]/35"
                  disabled={attachment.uploadState === "error"}
                  type="button"
                  onClick={() => {
                    setPreviewIndex(index);
                  }}
                >
                  {content}
                </button>
              )}
              {onRemove ? (
                <button
                  aria-label="Remove attachment"
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-900 dark:hover:text-gray-100"
                  type="button"
                  onClick={() => {
                    onRemove(index);
                  }}
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {previewMedia ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setPreviewIndex(null);
            }
          }}
        >
          <DialogContent className="max-w-5xl p-2">
            <DialogTitle className="sr-only">
              {previewMedia.filename || previewMedia.title || "Attachment"}
            </DialogTitle>
            <img
              alt={previewMedia.alt ?? ""}
              className="max-h-[80vh] w-full rounded object-contain"
              src={previewMedia.url ?? previewMedia.originalUrl ?? ""}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
