"use client";

import {
  useCallback,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type DragEvent,
} from "react";
import type { ControllerRenderProps, FieldValues } from "react-hook-form";
import { Paperclip, Upload, X } from "lucide-react";
import { twMerge } from "tailwind-merge";

import ProgressIcon from "@kenstack/icons/Progress";
import AttachmentList, {
  type AttachmentListItem,
} from "@kenstack/components/AttachmentList";
import Field, { FormControl, type FieldProps } from "@kenstack/forms/Field";
import AddImageIcon from "@kenstack/forms/ImageField/AddImageIcon";
import { useForm } from "@kenstack/forms/context";
import { uploadMedia } from "@kenstack/forms/lib/uploadMedia";
import {
  attachmentUploadStatusLabels,
  getAttachmentDocumentMeta,
} from "@kenstack/lib/attachments";
import { rasterMimeTypes as acceptDefault } from "@kenstack/db/tables/media/mimeTypes";
import ImageDetailsModal, {
  type ImageDetailsValue,
} from "@kenstack/admin/forms/ImageDetailsModal";

type MediaImage = ImageDetailsValue &
  AttachmentListItem & {
    action?: "upload";
    localId?: string;
    mediaId?: string;
    previewUrl?: string;
  };

function AttachmentFilePreview({ media }: { media: AttachmentListItem }) {
  const {
    className,
    icon: Icon,
    label,
  } = getAttachmentDocumentMeta(media.sourceType);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-2 text-center">
      <span
        className={twMerge(
          "flex size-14 items-center justify-center rounded border",
          className,
        )}
      >
        <Icon className="size-8" />
      </span>
      <span className="text-foreground max-w-full truncate text-xs font-semibold tracking-normal">
        {label}
      </span>
      {media.filename ? (
        <span className="text-muted-foreground max-w-full truncate text-[0.6875rem] leading-tight">
          {media.filename}
        </span>
      ) : null}
    </div>
  );
}

type MediaRenderProps = {
  apiPath: string;
  data?: Record<string, unknown>;
  accept?: readonly string[];
  className?: string;
  itemClassName?: string;
  placeholder?: React.ReactNode;
  replacementPlaceholder?: React.ReactNode;
  uploadClassName?: string;
  canUpload?: boolean;
  presignedUrlAction?: string;
  uploadCompleteAction?: string;
  variant?: "grid" | "attachments";
  multiple?: boolean;
};

export type MediaListFieldProps = FieldProps &
  ComponentProps<"div"> &
  MediaRenderProps;

const buttonClass =
  "bg-muted hover:bg-secondary inline-flex size-6 items-center justify-center rounded-full border";

export default function MediaListField({
  name,
  label,
  description,
  ...props
}: MediaListFieldProps) {
  return (
    <Field
      name={name}
      label={label}
      description={description}
      render={mediaRender(props)}
    />
  );
}

const mediaRender = ({
  apiPath,
  data: extraData,
  accept = acceptDefault,
  className,
  itemClassName,
  placeholder,
  replacementPlaceholder,
  uploadClassName,
  canUpload = true,
  presignedUrlAction = "get-presigned-url",
  uploadCompleteAction = "upload-complete",
  variant = "grid",
  multiple = true,
}: MediaRenderProps) =>
  function MediaListFieldRender({
    field,
  }: {
    field: ControllerRenderProps<FieldValues, string>;
  }) {
    const { form, finishUploading, setStatusMessage, startUploading } =
      useForm();
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const acceptStr = accept.join(", ");
    const value = multiple
      ? Array.isArray(field.value)
        ? (field.value as MediaImage[])
        : []
      : field.value && typeof field.value === "object"
        ? [field.value as MediaImage]
        : [];
    const setImages = useCallback(
      (images: MediaImage[]) => {
        field.onChange(multiple ? images : (images[0] ?? null));
      },
      [field],
    );

    const getImages = () => {
      const current = form.getValues(field.name);
      if (multiple) {
        return Array.isArray(current) ? (current as MediaImage[]) : [];
      }

      return current && typeof current === "object"
        ? [current as MediaImage]
        : [];
    };

    const updateLocalImage = (localId: string, image: Partial<MediaImage>) => {
      setImages(
        getImages().map((item) =>
          item.localId === localId ? { ...item, ...image } : item,
        ),
      );
    };

    const uploadFile = async (file: File, localId: string) => {
      if (!file) {
        return { status: "error", message: "No file was selected." } as const;
      }

      updateLocalImage(localId, { uploadState: "uploading" });
      const result = await uploadMedia({
        apiPath,
        extraData,
        fieldname: field.name,
        file,
        presignedUrlAction,
        uploadCompleteAction,
      });

      if (result.status === "error") {
        if (result.stage === "s3") {
          setStatusMessage({
            status: "error",
            message:
              "There was a problem uploading your file. Please try again.",
          });
        }

        updateLocalImage(localId, { uploadState: "error" });
        return { status: "error", message: result.message } as const;
      }

      const { complete } = result;
      updateLocalImage(localId, {
        kind: complete.kind,
        url: complete.url,
        width: complete.width,
        height: complete.height,
        filename: complete.filename ?? file.name,
        sourceType: complete.sourceType ?? file.type,
        sourceSize: complete.sourceSize ?? file.size,
        sourceWidth: complete.sourceWidth,
        sourceHeight: complete.sourceHeight,
        originalUrl: complete.originalUrl,
        previewUrl: undefined,
        uploadState: "done",
        action: "upload" as const,
        mediaId: complete.mediaId ?? complete.imageId,
      });
      return { status: "success" } as const;
    };

    const moveImage = (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) {
        return;
      }

      const next = [...value];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) {
        return;
      }

      next.splice(toIndex, 0, moved);
      setImages(next);
    };

    const updateImage = (index: number, image: MediaImage) => {
      setImages(value.map((item, key) => (key === index ? image : item)));
    };

    const removeImage = (index: number) => {
      setImages(value.filter((_, key) => key !== index));
    };

    const uploadFiles = async (files: FileList | File[]) => {
      if (!canUpload) {
        return;
      }

      const acceptedFiles = [...files]
        .filter((file) => accept.includes(file.type))
        .slice(0, multiple ? undefined : 1);

      if (!acceptedFiles.length) {
        return;
      }

      form.clearErrors(field.name);

      const pendingImages = acceptedFiles.map((file) => {
        const previewUrl = URL.createObjectURL(file);
        const kind: AttachmentListItem["kind"] = file.type.startsWith("image/")
          ? undefined
          : "file";

        return {
          localId: crypto.randomUUID(),
          kind,
          previewUrl,
          url: previewUrl,
          filename: file.name,
          sourceType: file.type,
          sourceSize: file.size,
          uploadState: "pending" as const,
        };
      });

      const previousImages = getImages();
      setImages(
        multiple ? [...previousImages, ...pendingImages] : pendingImages,
      );
      startUploading(field.name);

      const failedLocalIds = new Set<string>();
      const failedMessages = new Set<string>();

      try {
        for (const [index, file] of acceptedFiles.entries()) {
          const pending = pendingImages[index];
          if (pending) {
            try {
              const result = await uploadFile(file, pending.localId);
              if (result.status === "error") {
                failedLocalIds.add(pending.localId);
                if (result.message) {
                  failedMessages.add(result.message);
                }
              }
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              setStatusMessage(error instanceof Error ? error : message);
              updateLocalImage(pending.localId, { uploadState: "error" });
              failedLocalIds.add(pending.localId);
              failedMessages.add(message);
            }
          }
        }
      } finally {
        const nextImages = getImages()
          .filter(
            (image) => !image.localId || !failedLocalIds.has(image.localId),
          )
          .map((image) => {
            if (image.uploadState !== "done") {
              return image;
            }

            const nextImage = { ...image };
            delete nextImage.localId;
            delete nextImage.previewUrl;
            delete nextImage.uploadState;
            return nextImage;
          });

        pendingImages.forEach((image) => {
          if (image.previewUrl) {
            URL.revokeObjectURL(image.previewUrl);
          }
        });

        setImages(
          !multiple && failedLocalIds.size && nextImages.length === 0
            ? previousImages
            : nextImages,
        );

        if (failedLocalIds.size) {
          const [message] = failedMessages;
          form.setError(field.name, {
            type: "validate",
            message:
              failedLocalIds.size === 1
                ? `${message ?? "One file could not be uploaded."} The file was removed from media.`
                : `${failedLocalIds.size} files could not be uploaded and were removed from media.`,
          });
        }

        finishUploading(field.name);
      }
    };

    const dragEvents = {
      onDragEnter: (evt: DragEvent<HTMLElement>) => {
        evt.preventDefault();
        evt.stopPropagation();
      },
      onDragOver: (evt: DragEvent<HTMLElement>) => {
        evt.preventDefault();
        evt.stopPropagation();
      },
      onDrop: (evt: DragEvent<HTMLElement>) => {
        evt.preventDefault();
        evt.stopPropagation();

        if (canUpload && evt.dataTransfer.files?.length) {
          uploadFiles(evt.dataTransfer.files);
        }
      },
    };

    const input = (
      <FormControl>
        <input
          className="sr-only"
          type="file"
          multiple={multiple}
          accept={acceptStr}
          disabled={!canUpload}
          onChange={(evt: ChangeEvent<HTMLInputElement>) => {
            const target = evt.currentTarget;
            if (canUpload && target.files) {
              uploadFiles(target.files);
              target.value = "";
            }
          }}
        />
      </FormControl>
    );

    if (variant === "attachments") {
      return (
        <div
          className={twMerge(
            "border-border space-y-2 rounded-md border p-2",
            className,
          )}
          {...dragEvents}
        >
          <label
            className={twMerge(
              "border-border bg-muted text-muted-foreground flex min-h-12 items-center gap-3 rounded-md border border-dashed px-3 py-2 text-sm",
              canUpload
                ? "hover:bg-secondary cursor-pointer"
                : "cursor-not-allowed opacity-50",
              uploadClassName,
            )}
          >
            <Paperclip className="text-muted-foreground size-4 shrink-0" />
            <span className="min-w-0">
              {(!multiple && value.length
                ? (replacementPlaceholder ?? placeholder)
                : placeholder) ?? (
                <>
                  <span className="block font-medium">Attach files</span>
                  <span className="text-muted-foreground block text-xs">
                    Photos, PDFs, and Word documents are accepted.
                  </span>
                </>
              )}
            </span>
            {input}
          </label>

          <AttachmentList
            attachments={value}
            itemClassName={itemClassName}
            onRemove={removeImage}
          />
        </div>
      );
    }

    return (
      <div
        className={twMerge(
          "border-border flex flex-wrap gap-3 rounded border p-3",
          className,
        )}
        {...dragEvents}
      >
        {value.map((image, index) => {
          const fileMedia = image.kind === "file";
          const uploadStatus =
            image.uploadState && image.uploadState !== "done"
              ? attachmentUploadStatusLabels[image.uploadState]
              : null;

          return (
            <div
              key={image.id ?? image.mediaId ?? image.url}
              draggable
              className={twMerge(
                "border-border bg-muted/50 relative size-28 cursor-grab overflow-hidden rounded border active:cursor-grabbing",
                image.uploadState === "error" && "opacity-45 grayscale",
                itemClassName,
              )}
              onDragStart={(evt) => {
                setDragIndex(index);
                evt.dataTransfer.effectAllowed = "move";
                evt.dataTransfer.setData("action", "moveMediaImage");
              }}
              onDragEnd={() => {
                setDragIndex(null);
              }}
              onDragOver={(evt) => {
                if (dragIndex !== null) {
                  evt.preventDefault();
                  evt.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(evt) => {
                evt.preventDefault();
                evt.stopPropagation();
                if (dragIndex !== null) {
                  moveImage(dragIndex, index);
                  setDragIndex(null);
                }
              }}
            >
              <button
                type="button"
                title="Remove media"
                aria-label="Remove media"
                draggable={false}
                className={"absolute top-1 right-1 z-20 " + buttonClass}
                onPointerDown={(evt) => {
                  evt.stopPropagation();
                }}
                onClick={(evt) => {
                  evt.stopPropagation();
                  removeImage(index);
                }}
              >
                <X />
              </button>
              <button
                type="button"
                className="block h-full w-full"
                disabled={image.uploadState === "error" || fileMedia}
                onClick={() => {
                  if (!fileMedia) {
                    setEditingIndex(index);
                  }
                }}
              >
                {fileMedia ? (
                  <AttachmentFilePreview media={image} />
                ) : (
                  <img
                    alt={image.alt ?? ""}
                    className="h-full w-full object-cover"
                    src={image.previewUrl ?? image.url}
                  />
                )}
                {uploadStatus && image.uploadState !== "uploading" ? (
                  <div
                    className={twMerge(
                      "absolute inset-0 flex items-center justify-center bg-black/35 text-xs font-medium text-white",
                      image.uploadState === "error" &&
                        "bg-black/45 px-2 text-center",
                    )}
                  >
                    {uploadStatus}
                  </div>
                ) : null}
                {image.uploadState === "uploading" ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <ProgressIcon
                      className="size-8 animate-spin text-white"
                      style={{ animationDuration: "2s" }}
                    />
                  </div>
                ) : null}
              </button>
            </div>
          );
        })}

        <label
          className={twMerge(
            "border-border bg-muted/50 text-muted-foreground flex size-28 items-center justify-center rounded border border-dashed",
            canUpload
              ? "hover:bg-muted cursor-pointer"
              : "cursor-not-allowed opacity-50",
            uploadClassName,
          )}
        >
          {value.length ? (
            <Upload className="size-8" />
          ) : (
            (placeholder ?? <AddImageIcon className="size-16" />)
          )}
          {input}
        </label>

        {editingIndex !== null && value[editingIndex] ? (
          <ImageDetailsModal
            image={value[editingIndex]}
            onChange={(image) => {
              updateImage(editingIndex, {
                ...value[editingIndex],
                ...image,
              });
            }}
            onClose={() => {
              setEditingIndex(null);
            }}
          />
        ) : null}
      </div>
    );
  };
