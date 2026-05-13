"use client";

import { useCallback, useState, type ChangeEvent, type DragEvent } from "react";
import type { ControllerRenderProps, FieldValues } from "react-hook-form";
import { ImagePlus, Upload, X } from "lucide-react";
import { twMerge } from "tailwind-merge";

import IconButton from "@kenstack/components/IconButton";
import ProgressIcon from "@kenstack/icons/Progress";
import Field, { type FieldProps } from "@kenstack/forms/Field";
import { useForm } from "@kenstack/forms/context";
import fetcher from "@kenstack/lib/fetcher";
import { imageMimeTypes as acceptDefault } from "@kenstack/db/tables/images/mimeTypes";
import { useAdminEdit } from "@kenstack/admin/Edit/context";
import ImageDetailsModal, {
  type ImageDetailsValue,
} from "@kenstack/admin/forms/ImageDetailsModal";

type GalleryImage = ImageDetailsValue & {
  localId?: string;
  previewUrl?: string;
  uploadState?: "pending" | "uploading" | "done" | "error";
  action?: "upload";
  imageId?: string;
};

type GalleryRenderProps = {
  apiPath: string;
  data?: Record<string, unknown>;
  accept?: readonly string[];
  className?: string;
};

export type GalleryFieldProps = FieldProps &
  React.ComponentProps<"div"> &
  Omit<GalleryRenderProps, "apiPath" | "data">;

type GalleryFieldRenderProps = {
  field: ControllerRenderProps<FieldValues, string>;
};

const buttonClass =
  "size-6 bg-gray-200/80 hover:bg-gray-400 border rounded-full";

export default function GalleryField({
  name,
  label,
  description,
  ...props
}: GalleryFieldProps) {
  const { apiPath, name: adminName } = useAdminEdit();
  const data = {
    name: adminName,
  };

  return (
    <Field
      name={name}
      label={label}
      description={description}
      render={galleryRender({ ...props, apiPath, data })}
    />
  );
}

const galleryRender = ({
  apiPath,
  data: extraData,
  accept = acceptDefault,
  className,
}: GalleryRenderProps) =>
  function GalleryFieldRender({ field }: GalleryFieldRenderProps) {
    const { form, finishUploading, setStatusMessage, startUploading } =
      useForm();
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const acceptStr = accept.join(", ");
    const value = Array.isArray(field.value)
      ? (field.value as GalleryImage[])
      : [];

    const setImages = useCallback(
      (images: GalleryImage[]) => {
        field.onChange(images);
      },
      [field],
    );

    const getImages = () => {
      const current = form.getValues(field.name);
      return Array.isArray(current) ? (current as GalleryImage[]) : [];
    };

    const updateLocalImage = (
      localId: string,
      image: Partial<GalleryImage>,
    ) => {
      setImages(
        getImages().map((item) =>
          item.localId === localId ? { ...item, ...image } : item,
        ),
      );
    };

    const removeLocalImage = (localId: string) => {
      setImages(getImages().filter((item) => item.localId !== localId));
    };

    const uploadFile = async (file: File, localId: string) => {
      if (!file) {
        return "error";
      }

      if (file.size > 5 * 1024 ** 2) {
        updateLocalImage(localId, { uploadState: "error" });
        form.setError(field.name, {
          type: "validate",
          message: "Maximum image size is 5 megabytes.",
        });
        return "too-large";
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
        setStatusMessage({ status: "error", message: res.message });
        updateLocalImage(localId, { uploadState: "error" });
        return "error";
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
          return "error";
        }
      } catch (error) {
        setStatusMessage({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
        updateLocalImage(localId, { uploadState: "error" });
        return "error";
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
        setStatusMessage({ status: "error", message: complete.message });
        updateLocalImage(localId, { uploadState: "error" });
        return "error";
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
        imageId: complete.imageId,
      });
      return "success";
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

    const updateImage = (index: number, image: GalleryImage) => {
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
      const tooLargeLocalIds: string[] = [];

      try {
        for (const [index, file] of acceptedFiles.entries()) {
          const pending = pendingImages[index];
          if (pending) {
            const result = await uploadFile(file, pending.localId);
            if (result === "too-large") {
              if (acceptedFiles.length === 1) {
                removeLocalImage(pending.localId);
              } else {
                tooLargeLocalIds.push(pending.localId);
              }
            }
          }
        }
      } finally {
        if (tooLargeLocalIds.length) {
          setImages(
            getImages().filter(
              (item) =>
                !item.localId || !tooLargeLocalIds.includes(item.localId),
            ),
          );
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
            key={image.id ?? image.imageId ?? image.url}
            draggable
            className={
              "relative size-28 cursor-grab overflow-hidden rounded border border-gray-200 bg-gray-100 active:cursor-grabbing dark:border-gray-800 dark:bg-gray-900" +
              (image.uploadState === "error" ? " opacity-45 grayscale" : "")
            }
            onDragStart={(evt) => {
              setDragIndex(index);
              evt.dataTransfer.effectAllowed = "move";
              evt.dataTransfer.setData("action", "moveGalleryImage");
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
            onClick={() => {
              if (image.uploadState !== "error") {
                setEditingIndex(index);
              }
            }}
          >
            <IconButton
              type="button"
              className={"absolute top-1 right-1 z-10 " + buttonClass}
              tooltip="Remove image"
              onClick={(evt) => {
                evt.stopPropagation();
                setImages(value.filter((_, key) => key !== index));
              }}
            >
              <X />
            </IconButton>
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
          </div>
        ))}

        <label className="flex size-28 cursor-pointer items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
          {value.length ? (
            <Upload className="size-8" />
          ) : (
            <ImagePlus className="size-10" />
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
