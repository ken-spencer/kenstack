"use client";

import { useCallback, useState, type ChangeEvent, type DragEvent } from "react";
import type { ControllerRenderProps, FieldValues } from "react-hook-form";
import { Upload, X } from "lucide-react";
import { twMerge } from "tailwind-merge";

import ProgressIcon from "@kenstack/icons/Progress";
import Field, { type FieldProps } from "@kenstack/forms/Field";
import AddImageIcon from "@kenstack/forms/ImageField/AddImageIcon";
import { useForm } from "@kenstack/forms/context";
import getUploadErrorMessage from "@kenstack/forms/getUploadErrorMessage";
import fetcher from "@kenstack/api/fetcher";
import { rasterMimeTypes as acceptDefault } from "@kenstack/db/tables/media/mimeTypes";
import { useAdminEdit } from "@kenstack/admin/Edit/context";
import ImageDetailsModal, {
  type ImageDetailsValue,
} from "@kenstack/admin/forms/ImageDetailsModal";

type MediaImage = ImageDetailsValue & {
  localId?: string;
  previewUrl?: string;
  uploadState?: "pending" | "uploading" | "done" | "error";
  action?: "upload";
  mediaId?: string;
};

type MediaRenderProps = {
  apiPath: string;
  data?: Record<string, unknown>;
  accept?: readonly string[];
  className?: string;
  placeholder?: React.ReactNode;
};

type MediaListFieldProps = FieldProps &
  React.ComponentProps<"div"> &
  Omit<MediaRenderProps, "apiPath" | "data">;

const buttonClass =
  "inline-flex size-6 items-center justify-center rounded-full border bg-gray-200/80 hover:bg-gray-400";

export default function MediaListField({
  name,
  label,
  description,
  ...props
}: MediaListFieldProps) {
  const { apiPath, name: adminName } = useAdminEdit();
  const data = {
    name: adminName,
  };

  return (
    <Field
      name={name}
      label={label}
      description={description}
      render={mediaRender({ ...props, apiPath, data })}
    />
  );
}

const mediaRender = ({
  apiPath,
  data: extraData,
  accept = acceptDefault,
  className,
  placeholder,
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
    const value = Array.isArray(field.value)
      ? (field.value as MediaImage[])
      : [];

    const setImages = useCallback(
      (images: MediaImage[]) => {
        field.onChange(images);
      },
      [field],
    );

    const getImages = () => {
      const current = form.getValues(field.name);
      return Array.isArray(current) ? (current as MediaImage[]) : [];
    };

    const updateLocalImage = (
      localId: string,
      image: Partial<MediaImage>,
    ) => {
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
      const res = await fetcher<{
        uploadUrl: string;
        id: string;
      }>(apiPath, {
        ...(extraData ? extraData : {}),
        action: "get-presigned-url",
        filename: file.name,
        type: file.type,
        fieldname: field.name,
        size: file.size,
      });

      if (res.status === "error") {
        const message = getUploadErrorMessage(res);
        updateLocalImage(localId, { uploadState: "error" });
        return { status: "error", message } as const;
      }

      try {
        const uploadRes = await fetch(res.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
            "Content-Length": file.size.toString(),
          },
          body: file,
        });

        if (!uploadRes.ok) {
          setStatusMessage({
            status: "error",
            message:
              "There was a problem uploading your image. Please try again.",
          });
          updateLocalImage(localId, { uploadState: "error" });
          return {
            status: "error",
            message:
              "There was a problem uploading your image. Please try again.",
          } as const;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setStatusMessage(error instanceof Error ? error : message);
        updateLocalImage(localId, { uploadState: "error" });
        return { status: "error", message } as const;
      }

      const complete = await fetcher<{
        imageId: string;
        url: string;
        width?: number;
        height?: number;
        filename?: string;
        sourceType?: string;
        sourceSize?: number;
        sourceWidth?: number;
        sourceHeight?: number;
        originalUrl?: string;
      }>(apiPath, {
        ...(extraData ? extraData : {}),
        action: "upload-complete",
        fieldname: field.name,
        imageId: res.id,
      });

      if (complete.status === "error") {
        const message = getUploadErrorMessage(complete);
        updateLocalImage(localId, { uploadState: "error" });
        return { status: "error", message } as const;
      }

      updateLocalImage(localId, {
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
        mediaId: complete.imageId,
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

    const uploadFiles = async (files: FileList | File[]) => {
      const acceptedFiles = [...files].filter((file) =>
        accept.includes(file.type),
      );

      if (!acceptedFiles.length) {
        return;
      }

      form.clearErrors(field.name);

      const pendingImages = acceptedFiles.map((file) => {
        const previewUrl = URL.createObjectURL(file);
        return {
          localId: crypto.randomUUID(),
          previewUrl,
          url: previewUrl,
          filename: file.name,
          sourceType: file.type,
          sourceSize: file.size,
          uploadState: "pending" as const,
        };
      });

      setImages([...getImages(), ...pendingImages]);
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

        setImages(nextImages);

        if (failedLocalIds.size) {
          const [message] = failedMessages;
          form.setError(field.name, {
            type: "validate",
            message:
              failedLocalIds.size === 1
                ? `${message ?? "One image could not be uploaded."} The image was removed from media.`
                : `${failedLocalIds.size} images could not be uploaded and were removed from media.`,
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

        if (evt.dataTransfer.files?.length) {
          uploadFiles(evt.dataTransfer.files);
        }
      },
    };

    const input = (
      <input
        className="sr-only"
        type="file"
        multiple
        accept={acceptStr}
        onChange={(evt: ChangeEvent<HTMLInputElement>) => {
          const target = evt.currentTarget;
          if (target.files) {
            uploadFiles(target.files);
            target.value = "";
          }
        }}
      />
    );

    return (
      <div
        className={twMerge(
          "flex flex-wrap gap-3 rounded border border-gray-200 p-3 dark:border-gray-800",
          className,
        )}
        {...dragEvents}
      >
        {value.map((image, index) => (
          <div
            key={image.id ?? image.mediaId ?? image.url}
            draggable
            className={
              "relative size-28 cursor-grab overflow-hidden rounded border border-gray-200 bg-gray-100 active:cursor-grabbing dark:border-gray-800 dark:bg-gray-900" +
              (image.uploadState === "error" ? " opacity-45 grayscale" : "")
            }
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
              title="Remove image"
              aria-label="Remove image"
              draggable={false}
              className={"absolute top-1 right-1 z-20 " + buttonClass}
              onPointerDown={(evt) => {
                evt.stopPropagation();
              }}
              onClick={(evt) => {
                evt.stopPropagation();
                setImages(value.filter((_, key) => key !== index));
              }}
            >
              <X />
            </button>
            <button
              type="button"
              className="block h-full w-full"
              disabled={image.uploadState === "error"}
              onClick={() => {
                setEditingIndex(index);
              }}
            >
              <img
                alt={image.alt ?? ""}
                className="h-full w-full object-cover"
                src={image.previewUrl ?? image.url}
              />
              {image.uploadState === "pending" ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-xs font-medium text-white">
                  Waiting
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
              {image.uploadState === "error" ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45 px-2 text-center text-xs font-medium text-white">
                  Too large
                </div>
              ) : null}
            </button>
          </div>
        ))}

        <label className="flex size-28 cursor-pointer items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
          {value.length ? (
            <Upload className="size-8" />
          ) : (
            placeholder ?? <AddImageIcon className="h-16 w-16 text-gray-600" />
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
