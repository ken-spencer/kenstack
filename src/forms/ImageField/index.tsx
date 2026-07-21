import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import Image from "next/image";
import type { ControllerRenderProps, FieldValues } from "react-hook-form";

import AddImageIcon from "./AddImageIcon";
import ProgressIcon from "@kenstack/icons/Progress";
import { Crop, Upload as UploadIcon, X as CancelIcon } from "lucide-react";

import { twMerge } from "tailwind-merge";
import Field, { FormControl, type FieldProps } from "@kenstack/forms/Field";
import Button from "@kenstack/components/Button";
import Help from "@kenstack/components/Help";
import { useForm } from "@kenstack/forms/context";
import { uploadMedia } from "@kenstack/forms/lib/uploadMedia";

import { rasterMimeTypes as acceptDefault } from "@kenstack/db/tables/media/mimeTypes";
import type {
  ImageDetailsEditor,
  ImageDetailsValue,
} from "@kenstack/forms/ImageDetails";
import SquareCropModal from "@kenstack/forms/SquareCrop/Modal";
import SquareCropPreview from "@kenstack/forms/SquareCrop/Preview";
import {
  applySquareCropChange,
  type SquareCropChangeValue,
} from "@kenstack/forms/SquareCrop/change";

const buttonClass = "bg-muted hover:bg-secondary size-6 rounded-full border";

type ImageRenderProps = {
  shape?: "original" | "round" | "square";
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

export default function ImageField(props: ImageFieldProps) {
  return <ImageFieldControl {...props} />;
}

export function ImageFieldWithDetails(
  props: ImageFieldProps & { ImageDetails: ImageDetailsEditor },
) {
  return <ImageFieldControl {...props} />;
}

function ImageFieldControl({
  name,
  label,
  help,
  description,
  ImageDetails,
  ...props
}: ImageFieldProps & { ImageDetails?: ImageDetailsEditor }) {
  return (
    <Field
      name={name}
      label={label}
      help={help}
      description={description}
      render={imageRender({ ...props, ImageDetails })}
    />
  );
}

const imageRender = ({
  shape = "square",
  apiPath,
  data: extraData,
  placeholder,
  imageClass,
  className,
  accept = acceptDefault,
  canUpload = true,
  presignedUrlAction = "get-presigned-url",
  uploadCompleteAction = "upload-complete",
  ImageDetails,
}: ImageRenderProps & { ImageDetails?: ImageDetailsEditor }) =>
  function ImageFieldRender({
    field,
  }: {
    field: ControllerRenderProps<FieldValues, string>;
  }) {
    const { finishUploading, form, setStatusMessage, startUploading } =
      useForm();
    const value = field.value as
      (ImageDetailsValue & SquareCropChangeValue) | null;

    const acceptStr = accept.join(", ");
    const round = shape === "round";
    const square = shape !== "original";
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
      round && "rounded-full border-0",
      imageClass,
    );
    const placeholderClass = twMerge(
      "border-border bg-muted/80 flex h-full w-full items-center justify-center rounded border border-dashed shadow-inner",
      round && "rounded-full border-0",
      imageClass,
    );
    const disabledHelp = canUpload ? null : <UploadDisabledHelp />;

    const [uploading, setUploading] = useState(false);
    const [uploadPreviewUrl, setUploadPreviewUrl] = useState("");
    const [editing, setEditing] = useState<"crop" | "details" | null>(null);
    const uploadControllerRef = useRef<AbortController | null>(null);

    const reset = () => {
      setUploadPreviewUrl("");
      setUploading(false);
    };

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
            setUploadPreviewUrl(reader.result);
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
          original: complete.original,
          squareCrop: complete.squareCrop,
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
          {uploadPreviewUrl ? (
            <img className={imgClass} src={uploadPreviewUrl} alt="" />
          ) : null}
          <Button
            type="button"
            className={"absolute top-1 right-1 cursor-pointer " + buttonClass}
            size="icon"
            tooltip="Cancel upload"
            variant="ghost"
            onClick={() => {
              uploadControllerRef.current?.abort();
              uploadControllerRef.current = null;
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

    if (value) {
      const savedImage = (
        <Image
          alt=""
          className={imgClass}
          height={128}
          loading="eager"
          src={value.url}
          unoptimized={value.kind === "svg"}
          width={128}
        />
      );

      if (!canUpload) {
        return (
          <div className={contClass}>
            {savedImage}
            {disabledHelp}
          </div>
        );
      }

      const cropSource = square ? value.original : null;
      const imagePreview =
        cropSource && form.getFieldState(field.name).isDirty ? (
          <SquareCropPreview
            alt=""
            className={imgClass}
            crop={value.squareCrop}
            source={cropSource}
          />
        ) : (
          savedImage
        );

      return (
        <div className={contClass} {...dragEvents}>
          <Button
            type="button"
            aria-label="Delete image"
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
          {ImageDetails ? (
            <button
              type="button"
              aria-label="Edit image details"
              className="h-full w-full cursor-pointer"
              onClick={(evt) => {
                evt.stopPropagation();
                setEditing("details");
              }}
            >
              {imagePreview}
            </button>
          ) : (
            <div className="h-full w-full">{imagePreview}</div>
          )}
          {cropSource ? (
            <Button
              type="button"
              aria-label="Adjust crop"
              className="bg-background/90 absolute right-1 bottom-1 z-10"
              icon={Crop}
              size="icon-xs"
              tooltip="Adjust crop"
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                setEditing("crop");
              }}
            />
          ) : null}
          {ImageDetails && editing === "details" ? (
            <ImageDetails
              image={value}
              onChange={(image) => {
                field.onChange({
                  ...value,
                  ...image,
                });
              }}
              onClose={() => setEditing(null)}
            />
          ) : null}
          {editing === "crop" && cropSource ? (
            <SquareCropModal
              crop={value.squareCrop}
              round={round}
              source={cropSource}
              onChange={(squareCrop) => {
                field.onChange(applySquareCropChange(value, squareCrop));
              }}
              onClose={() => setEditing(null)}
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
