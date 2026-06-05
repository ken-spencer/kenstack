"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import IconButton from "@kenstack/components/IconButton";
import type { SquareCrop } from "@kenstack/db/tables/media/types";

export type ImageDetailsValue = {
  id?: number;
  url: string;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  title?: string | null;
  caption?: string | null;
  filename?: string | null;
  sourceType?: string | null;
  sourceSize?: number | null;
  sourceWidth?: number | null;
  sourceHeight?: number | null;
  originalUrl?: string | null;
  squareCrop?: SquareCrop | null;
};

function formatFileSize(size?: number | null) {
  if (!size) {
    return "";
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / 1024 ** 2).toFixed(1)} MB`;
}

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

  useEffect(() => {
    const onKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(evt) => {
        if (evt.target === evt.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="my-auto grid max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-hidden rounded border border-gray-200 bg-white shadow-xl md:h-[min(44rem,calc(100vh-2rem))] md:grid-cols-[minmax(0,1fr)_22rem] dark:border-gray-800 dark:bg-gray-950">
        <div className="flex min-h-0 items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
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
                <p className="text-sm break-all text-gray-500">
                  {image.filename}
                </p>
              ) : null}
            </div>
            <IconButton
              type="button"
              className="size-8 rounded border"
              tooltip="Close"
              onClick={onClose}
            >
              <X />
            </IconButton>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Alt text</span>
              <input
                className="rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                value={image.alt ?? ""}
                onChange={(evt) => {
                  onChange({ ...image, alt: evt.target.value });
                }}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Title</span>
              <input
                className="rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                value={image.title ?? ""}
                onChange={(evt) => {
                  onChange({ ...image, title: evt.target.value });
                }}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Caption</span>
              <textarea
                className="min-h-24 rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                value={image.caption ?? ""}
                onChange={(evt) => {
                  onChange({ ...image, caption: evt.target.value });
                }}
              />
            </label>
          </div>

          <dl className="mt-auto grid gap-2 border-t border-gray-200 pt-4 text-sm dark:border-gray-800">
            {dimensions ? (
              <div className="grid grid-cols-[7rem_1fr] gap-2">
                <dt className="text-gray-500">Dimensions</dt>
                <dd>{dimensions}</dd>
              </div>
            ) : null}
            {image.sourceType ? (
              <div className="grid grid-cols-[7rem_1fr] gap-2">
                <dt className="text-gray-500">Type</dt>
                <dd>{image.sourceType}</dd>
              </div>
            ) : null}
            {image.sourceSize ? (
              <div className="grid grid-cols-[7rem_1fr] gap-2">
                <dt className="text-gray-500">Size</dt>
                <dd>{formatFileSize(image.sourceSize)}</dd>
              </div>
            ) : null}
            {previewUrl ? (
              <div className="grid grid-cols-[7rem_1fr] gap-2">
                <dt className="text-gray-500">Original</dt>
                <dd className="min-w-0">
                  <a
                    className="break-all text-blue-700 hover:underline dark:text-blue-300"
                    href={previewUrl}
                    target="_blank"
                  >
                    {previewUrl}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </div>
  );
}
