"use client";

import { X } from "lucide-react";

import Button from "@kenstack/components/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@kenstack/components/Dialog";
import type { ImageDetailsValue } from "@kenstack/forms/ImageDetails";
import { formatFileSize } from "@kenstack/lib/fileSize";

export type { ImageDetailsValue } from "@kenstack/forms/ImageDetails";

export default function ImageDetailsModal({
  image,
  onChange,
  onClose,
}: {
  image: ImageDetailsValue;
  onChange: (image: ImageDetailsValue) => void;
  onClose: () => void;
}) {
  const dimensions =
    image.sourceWidth && image.sourceHeight
      ? `${image.sourceWidth} x ${image.sourceHeight}`
      : image.width && image.height
        ? `${image.width} x ${image.height}`
        : "";
  const previewUrl = image.originalUrl || image.url;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="border-border bg-card grid max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-5xl md:h-[min(44rem,calc(100vh-2rem))] md:grid-cols-[minmax(0,1fr)_22rem]"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Image details</DialogTitle>
        <DialogDescription className="sr-only">
          Edit image details and review file metadata.
        </DialogDescription>

        <div className="bg-muted flex min-h-0 items-center justify-center p-4">
          <img
            alt={image.alt ?? ""}
            className="max-h-full max-w-full object-contain"
            src={previewUrl}
          />
        </div>

        <div className="flex min-h-0 flex-col overflow-y-auto p-4">
          <div className="flex items-start justify-between gap-3 pb-4">
            <div>
              <h3 className="text-lg font-medium">Image details</h3>
              {image.filename ? (
                <p className="text-muted-foreground text-sm break-all">
                  {image.filename}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              aria-label="Close image details"
              className="size-8 rounded border"
              size="icon"
              tooltip="Close"
              variant="ghost"
              onClick={onClose}
            >
              <X />
            </Button>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Alt text</span>
              <input
                className="border-input bg-background rounded border px-3 py-2"
                value={image.alt ?? ""}
                onChange={(event) =>
                  onChange({ ...image, alt: event.target.value })
                }
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Title</span>
              <input
                className="border-input bg-background rounded border px-3 py-2"
                value={image.title ?? ""}
                onChange={(event) =>
                  onChange({ ...image, title: event.target.value })
                }
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Caption</span>
              <textarea
                className="border-input bg-background min-h-24 rounded border px-3 py-2"
                value={image.caption ?? ""}
                onChange={(event) =>
                  onChange({ ...image, caption: event.target.value })
                }
              />
            </label>
          </div>

          <dl className="border-border mt-auto grid gap-2 border-t pt-4 text-sm">
            {dimensions ? (
              <Detail label="Dimensions">{dimensions}</Detail>
            ) : null}
            {image.sourceType ? (
              <Detail label="Type">{image.sourceType}</Detail>
            ) : null}
            {image.sourceSize ? (
              <Detail label="Size">{formatFileSize(image.sourceSize)}</Detail>
            ) : null}
            {previewUrl ? (
              <Detail label="Original">
                <a
                  className="break-all text-blue-700 hover:underline dark:text-blue-300"
                  href={previewUrl}
                  target="_blank"
                >
                  {previewUrl}
                </a>
              </Detail>
            ) : null}
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Detail({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
