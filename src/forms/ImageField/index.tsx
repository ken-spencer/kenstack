import { useCallback, useState, type ChangeEvent, type DragEvent } from "react";
import type { ControllerRenderProps, FieldValues } from "react-hook-form";

import fetcher from "@kenstack/api/fetcher";

import AddImageIcon from "./AddImageIcon";
import ProgressIcon from "@kenstack/icons/Progress";
import { Upload as UploadIcon, X as CancelIcon } from "lucide-react";

import { twMerge } from "tailwind-merge";
import Field, { type FieldProps } from "@kenstack/forms/Field";
import getUploadErrorMessage from "@kenstack/forms/getUploadErrorMessage";
import Button from "@kenstack/components/Button";
import Help from "@kenstack/components/Help";
import { useForm } from "@kenstack/forms/context";

import { rasterMimeTypes as acceptDefault } from "@kenstack/db/tables/media/mimeTypes";
import ImageDetailsModal, {
  type ImageDetailsValue,
} from "@kenstack/admin/forms/ImageDetailsModal";

const buttonClass =
  "size-6 bg-gray-200/60  hover:bg-gray-400 border rounded-full";

type ImageRenderProps = {
  square?: boolean;
  apiPath: string;
  data?: Record<string, unknown>;
  // setStatusMessage?: (message) => void;
  placeholder?: React.ReactNode;
  imageClass?: string;
  accept?: readonly string[];
  className?: string;
  canUpload?: boolean;
  presignedUrlAction?: string;
  uploadCompleteAction?: string;
};

export type ImageFieldProps = FieldProps &
  React.ComponentProps<"div"> &
  ImageRenderProps;

type ImageFieldRenderProps = {
  field: ControllerRenderProps<FieldValues, string>;
};

export default function ImageField({
  name,
  label,
  help,
  description,
  ...props
}: ImageFieldProps) {
  return (
    <Field
      name={name}
      label={label}
      help={help}
      description={description}
      render={imageRender({ ...props })}
    />
  );
}

const imageRender = ({
  square = true,
  apiPath,
  data: extraData,
  // setStatusMessage,
  placeholder,
  imageClass,
  className,
  accept = acceptDefault,
  canUpload = true,
  presignedUrlAction = "get-presigned-url",
  uploadCompleteAction = "upload-complete",
}: ImageRenderProps) =>
  function ImageFieldRender({ field }: ImageFieldRenderProps) {
    const { finishUploading, form, setStatusMessage, startUploading } =
      useForm();

    const acceptStr = accept.join(", ");
    const contClass = twMerge(
      "relative flex items-center justify-center",
      square ? "overflow-hidden w-32 h-32" : "w-max h-max w-32 max-h-32 ",
      className,
    );
    const imgClass = twMerge(
      "border border-gray-200 rounded",
      square
        ? "object-cover object-center w-full h-full"
        : "object-scale-down object-center w-full h-full",
      imageClass,
    );
    const disabledHelp = canUpload ? null : <UploadDisabledHelp />;

    const [uploading, setUploading] = useState(false);
    const [src, setSrc] = useState<string>("");

    const reset = useCallback(() => {
      setSrc("");
      setUploading(false);
    }, []);

    const uploadFile = async (file?: File) => {
      if (!file) {
        return;
      }

      setUploading(true);
      startUploading(field.name);
      form.clearErrors(field.name);
      try {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            setSrc(reader.result);
          }
        };
        reader.onerror = () => {
          setStatusMessage({
            status: "error",
            message: "Reader error:" + reader.error,
          });
        };
        reader.readAsDataURL(file);

        const res = await fetcher<{
          uploadUrl: string;
          id: string;
        }>(apiPath, {
          ...(extraData ? extraData : {}),
          action: presignedUrlAction,
          filename: file.name,
          type: file.type,
          fieldname: field.name,
          size: file.size,
        });

        if ("error" === res.status) {
          const message = getUploadErrorMessage(res);
          form.setError(field.name, {
            type: "validate",
            message,
          });
          reset();
          return;
        }

        const uploadRes = await fetch(res.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
            "Content-Length": file.size.toString(),
            // 'x-amz-checksum-crc32': 'AAAAAA=='   // ← add the header that was signed
          },

          body: file,
        });

        if (!uploadRes.ok) {
          const errorText = await uploadRes.text();
          //eslint-disable-next-line no-console
          console.error("S3 upload failed", {
            status: uploadRes.status,
            error: errorText,
          });

          setStatusMessage({
            status: "error",
            message:
              "There was a problem uploading your image. Please try again.",
          });
          reset();
          return;
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
          action: uploadCompleteAction,
          fieldname: field.name,
          imageId: res.id,
        });

        if (complete.status === "error") {
          const message = getUploadErrorMessage(complete);
          form.setError(field.name, {
            type: "validate",
            message,
          });
          reset();
          return;
        }

        field.onChange({
          url: complete.url,
          width: complete.width,
          height: complete.height,
          filename: complete.filename ?? file.name,
          sourceType: complete.sourceType ?? file.type,
          sourceSize: complete.sourceSize ?? file.size,
          sourceWidth: complete.sourceWidth,
          sourceHeight: complete.sourceHeight,
          originalUrl: complete.originalUrl,
          action: "upload",
          imageId: complete.imageId,
        });
        setUploading(false);
      } catch (e) {
        setStatusMessage(e instanceof Error ? e : String(e));
        reset();
      } finally {
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

        const dt = evt.dataTransfer;
        if (dt.getData("action") === "moveFile") {
          dt.effectAllowed = dt.dropEffect = "none";
        }
      },
      onDrop: (evt: DragEvent<HTMLElement>) => {
        evt.preventDefault();
        evt.stopPropagation();

        const dt = evt.dataTransfer;
        // cont[file] = dt.files ?? [];
        if (dt.files?.length) {
          const [file] = dt.files;
          if (accept.includes(file.type)) {
            uploadFile(file);
          }
        }
      },
    };

    const input = (
      <input
        className="sr-only"
        type="file"
        accept={acceptStr}
        onChange={(evt: ChangeEvent<HTMLInputElement>) => {
          const target = evt.currentTarget;
          if (target?.files) {
            uploadFile(target.files[0]);
            target.value = "";
          }
        }}
      />
    );

    if (uploading) {
      return (
        <div className={contClass}>
          {src && <img className={imgClass} src={src} alt="" />}
          <Button
            type="button"
            className={"absolute top-1 right-1 cursor-pointer " + buttonClass}
            size="icon"
            tooltip="Cancel"
            variant="ghost"
            onClick={() => {
              reset();
            }}
          >
            <CancelIcon />
          </Button>
          <div className="bg-opacity-40 absolute inset-0 m-auto h-12 w-12 rounded-full bg-black">
            <ProgressIcon
              className="h-12 w-12 animate-spin text-gray-100"
              style={{ animationDuration: "2s" }}
            />
          </div>
        </div>
      );
    }

    if (field.value) {
      if (!canUpload) {
        return (
          <div className={contClass}>
            <img alt="" className={imgClass} src={field.value.url} />
            {disabledHelp}
          </div>
        );
      }

      return (
        <div className={contClass} {...dragEvents}>
          <Button
            type="button"
            className={"absolute top-1 right-1 " + buttonClass}
            size="icon"
            tooltip="Delete image"
            variant="ghost"
            onClick={(evt) => {
              field.onChange(null);

              // commit();
              evt.stopPropagation();
            }}
          >
            <CancelIcon />
          </Button>
          <label
            title="Upload image"
            aria-label="Upload image"
            className={
              "absolute bottom-1 left-1 inline-flex cursor-pointer items-center justify-center " +
              buttonClass
            }
            onClick={(evt) => {
              evt.stopPropagation();
            }}
          >
            {input}
            <UploadIcon />
          </label>
          <button
            type="button"
            className="h-full w-full cursor-pointer"
            onClick={(evt) => {
              evt.stopPropagation();
              setSrc("details");
            }}
          >
            <img alt="" className={imgClass} src={field.value.url} />
          </button>
          {src === "details" ? (
            <ImageDetailsModal
              image={field.value as ImageDetailsValue}
              onChange={(image) => {
                field.onChange({
                  ...(field.value as ImageDetailsValue),
                  ...image,
                });
              }}
              onClose={() => {
                setSrc("");
              }}
            />
          ) : null}
        </div>
      );
    }

    if (!canUpload) {
      return (
        <div className={contClass}>
          <div className="h-full w-full opacity-50">
            {placeholder ?? (
              <div className={imgClass + " flex items-center justify-center"}>
                <AddImageIcon className="h-16 w-16 text-gray-600" />
              </div>
            )}
          </div>
          {disabledHelp}
        </div>
      );
    }

    return (
      <label className={twMerge(contClass, "cursor-pointer")} {...dragEvents}>
        {placeholder ?? (
          <div className={imgClass + " flex items-center justify-center"}>
            <AddImageIcon className="h-16 w-16 text-gray-600" />
          </div>
        )}
        {input}
        {/* <UploadIcon className="absolute bottom-1 left-1" /> */}
      </label>
    );
  };

function UploadDisabledHelp() {
  return (
    <div className="absolute top-1 right-1 rounded-full bg-white/90 shadow-sm ring-1 ring-black/10">
      <Help message="Image uploads require the following environment variables to be set: AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY." />
    </div>
  );
}
