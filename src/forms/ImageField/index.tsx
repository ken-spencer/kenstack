import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import type { ControllerRenderProps, FieldValues } from "react-hook-form";

import AddImageIcon from "./AddImageIcon";
import ProgressIcon from "@kenstack/icons/Progress";
import { Upload as UploadIcon, X as CancelIcon } from "lucide-react";

import { twMerge } from "tailwind-merge";
import Field, { FormControl, type FieldProps } from "@kenstack/forms/Field";
import Button from "@kenstack/components/Button";
import Help from "@kenstack/components/Help";
import { useForm } from "@kenstack/forms/context";
import { uploadMedia } from "@kenstack/forms/lib/uploadMedia";

import { rasterMimeTypes as acceptDefault } from "@kenstack/db/tables/media/mimeTypes";
import ImageDetailsModal, {
  type ImageDetailsValue,
} from "@kenstack/admin/forms/ImageDetailsModal";

const buttonClass = "bg-muted hover:bg-secondary size-6 rounded-full border";

type ImageRenderProps = {
  square?: boolean;
  apiPath: string;
  data?: Record<string, unknown>;
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
      "border-border rounded border",
      square
        ? "object-cover object-center w-full h-full"
        : "object-scale-down object-center w-full h-full",
      imageClass,
    );
    const placeholderClass = twMerge(
      "border-border bg-muted/80 flex h-full w-full items-center justify-center rounded border border-dashed shadow-inner",
      imageClass,
    );
    const disabledHelp = canUpload ? null : <UploadDisabledHelp />;

    const [uploading, setUploading] = useState(false);
    const [src, setSrc] = useState("");
    const uploadControllerRef = useRef<AbortController | null>(null);

    const reset = useCallback(() => {
      setSrc("");
      setUploading(false);
    }, []);

    const cancelUpload = useCallback(() => {
      uploadControllerRef.current?.abort();
      uploadControllerRef.current = null;
      reset();
    }, [reset]);

    useEffect(
      () => () => {
        uploadControllerRef.current?.abort();
      },
      [],
    );

    const uploadFile = async (file?: File) => {
      if (!file) {
        return;
      }

      uploadControllerRef.current?.abort();
      const uploadController = new AbortController();
      uploadControllerRef.current = uploadController;
      setUploading(true);
      startUploading(field.name);
      form.clearErrors(field.name);
      const reader = new FileReader();
      const abortReader = () => {
        if (reader.readyState === FileReader.LOADING) {
          reader.abort();
        }
      };
      uploadController.signal.addEventListener("abort", abortReader, {
        once: true,
      });

      try {
        reader.onload = () => {
          if (
            !uploadController.signal.aborted &&
            typeof reader.result === "string"
          ) {
            setSrc(reader.result);
          }
        };
        reader.onerror = () => {
          if (uploadController.signal.aborted) {
            return;
          }

          setStatusMessage({
            status: "error",
            message: "Reader error:" + reader.error,
          });
        };
        reader.readAsDataURL(file);

        const result = await uploadMedia({
          apiPath,
          extraData,
          fieldname: field.name,
          file,
          presignedUrlAction,
          signal: uploadController.signal,
          uploadCompleteAction,
        });

        if (result.status === "aborted") {
          return;
        }

        if (result.status === "error") {
          if (result.stage === "s3") {
            //eslint-disable-next-line no-console
            console.error("S3 upload failed", {
              status: result.responseStatus,
              error: result.responseText,
            });

            setStatusMessage({
              status: "error",
              message:
                "There was a problem uploading your image. Please try again.",
            });
          } else {
            form.setError(field.name, {
              type: "validate",
              message: result.message,
            });
          }
          reset();
          return;
        }

        const { complete } = result;
        if (uploadController.signal.aborted) {
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
        if (uploadController.signal.aborted) {
          return;
        }

        setStatusMessage(e instanceof Error ? e : String(e));
        reset();
      } finally {
        uploadController.signal.removeEventListener("abort", abortReader);
        const shouldFinishUploading =
          uploadControllerRef.current === uploadController ||
          uploadControllerRef.current === null;
        if (uploadControllerRef.current === uploadController) {
          uploadControllerRef.current = null;
        }

        if (shouldFinishUploading) {
          finishUploading(field.name);
        }
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
        if (dt.files?.length) {
          const [file] = dt.files;
          if (accept.includes(file.type)) {
            uploadFile(file);
          }
        }
      },
    };

    const input = (
      <FormControl>
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
      </FormControl>
    );

    if (uploading) {
      return (
        <div className={contClass}>
          {src && <img className={imgClass} src={src} alt="" />}
          <Button
            type="button"
            className={"absolute top-1 right-1 cursor-pointer " + buttonClass}
            size="icon"
            tooltip="Cancel upload"
            variant="ghost"
            onClick={() => {
              cancelUpload();
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
          <div className="h-full w-full">
            {placeholder ?? (
              <div className={placeholderClass}>
                <AddImageIcon className="text-muted-foreground h-16 w-16" />
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
          <div className={placeholderClass}>
            <AddImageIcon className="text-muted-foreground h-16 w-16" />
          </div>
        )}
        {input}
        {/* <UploadIcon className="absolute bottom-1 left-1" /> */}
      </label>
    );
  };

function UploadDisabledHelp() {
  return (
    <div className="bg-card/90 ring-border absolute top-1 right-1 rounded-full shadow-sm ring-1">
      <Help message="Image uploads require the following environment variables to be set: AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY." />
    </div>
  );
}
