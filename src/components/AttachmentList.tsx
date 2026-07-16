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
      <span className="border-border bg-muted block size-10 shrink-0 overflow-hidden rounded border">
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
                <span className="text-foreground line-clamp-2 text-sm leading-snug font-medium break-all">
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
                "border-border bg-card flex items-center gap-2 rounded-md border p-2",
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
                  className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-full transition"
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
          <DialogContent className="[&_[data-slot=dialog-close]]:bg-card/85 w-fit max-w-[calc(100vw-0.5rem)] gap-0 p-1 sm:max-w-[calc(100vw-0.5rem)] [&_[data-slot=dialog-close]]:top-2 [&_[data-slot=dialog-close]]:right-2 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:p-1.5 [&_[data-slot=dialog-close]]:shadow-sm [&_[data-slot=dialog-close]]:backdrop-blur">
            <DialogTitle className="sr-only">
              {previewMedia.filename || previewMedia.title || "Attachment"}
            </DialogTitle>
            <img
              alt={previewMedia.alt ?? ""}
              className="max-h-[calc(100dvh-0.5rem)] max-w-[calc(100vw-0.5rem)] rounded object-contain"
              src={previewMedia.originalUrl ?? previewMedia.url ?? ""}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
