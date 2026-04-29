import pick from "lodash-es/pick";
import { useCallback, useState, type ChangeEvent, type DragEvent } from "react";
import type { ControllerRenderProps, FieldValues } from "react-hook-form";

import fetcher from "@kenstack/lib/fetcher";

import AddImageIcon from "./AddImageIcon";
import ProgressIcon from "@kenstack/icons/Progress";
import { Upload as UploadIcon, X as CancelIcon } from "lucide-react";

import { twMerge } from "tailwind-merge";
import Field, { type FieldProps } from "@kenstack/forms/Field";
import IconButton from "@kenstack/components/IconButton";
import { useForm } from "@kenstack/forms/context";

import { imageMimeTypes as acceptDefault } from "@kenstack/zod/image";

const buttonClass =
  "size-6 bg-gray-200/60  hover:bg-gray-400 border rounded-full";

type ImageRenderProps = {
  square?: boolean;
  apiPath: string;
  data?: Record<string, unknown>;
  // setStatusMessage?: (message) => void;
  placeholder?: React.ReactNode;
  imageClass?: string;
  accept?: string[];
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
  description,
  ...props
}: ImageFieldProps) {
  return (
    <Field
      name={name}
      label={label}
      description={description}
      render={imageRender({ ...props })}
    />
  );
}

const imageRender = ({
  square = false,
  apiPath,
  data: extraData,
  // setStatusMessage,
  placeholder = <AddImageIcon className="h-16 w-16 text-gray-600" />,
  imageClass,
  accept = acceptDefault,
}: ImageRenderProps) =>
  function ImageFieldRender({ field }: ImageFieldRenderProps) {
    const { setStatusMessage } = useForm();

    const acceptStr = accept.join(", ");
    const contClass = twMerge(
      "relative flex items-center justify-center",
      square ? "overflow-hidden w-32 h-32" : "w-max h-max w-32 max-h-32 ",
    );
    const imgClass = twMerge(
      square
        ? "object-cover object-center w-full h-full"
        : "object-scale-down object-center w-full h-full",
      imageClass,
    );

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
      // Must be five megabytes or smaller.
      if (file.size > 5 * 1024 ** 2) {
        // const size = file.size / 1024 ** 2;
        // const sizeStr = size.toFixed(1);
        reset();
        setStatusMessage({
          status: "error",
          message: "Maximum image size is 5 megabytes.",
        });
        return;
      }
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

      console.log(apiPath);
      const res = await fetcher<{
        uploadUrl: string;
        // fields: Record<string, string | number | boolean | null>;
        // transformations: string[];
      }>(apiPath, {
        ...(extraData ? extraData : {}),
        action: "get-presigned-url",
        filename: file.name,
        type: file.type,
        fieldname: field.name,
        size: file.size,
      });

      if ("error" === res.status) {
        setStatusMessage({
          status: "error",
          message: res.message,
        });
        reset();
        return;
      }

      const { uploadUrl, key: awsKey } = res;

      console.log(uploadUrl);
      let uploadRes;
      try {
        uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
            "Content-Length": file.size.toString(),
            // 'x-amz-checksum-crc32': 'AAAAAA=='   // ← add the header that was signed
          },

          body: file,
        });
      } catch (e) {
        setStatusMessage({
          status: "error",
          message: e instanceof Error ? e.message : String(e),
        });
        reset();
        return;
      }

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.error("S3 upload failed", {
          status: uploadRes.status,
          error: errorText,
        });

        setStatusMessage({
          status: "error",
          message:
            "There wasd a problem uploading your image. Please try again.",
        });
        reset();
        return;
      }

      // TODO api request to resize image via sharp.
      // fetcher(apiPath, {
      //   ...(extraData ? extraData : {}),
      //   action: "upload-complete",
      //   fieldname: field.name,
      //   key: awsKey,
      // });

      // field.onChange(retval);
      setUploading(false);
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
          <IconButton
            type="button"
            className={"absolute top-1 right-1 cursor-pointer " + buttonClass}
            tooltip="Cancel"
            onClick={() => {
              reset();
            }}
          >
            <CancelIcon />
          </IconButton>
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
      return (
        <div className={twMerge(contClass)} {...dragEvents}>
          <IconButton
            type="button"
            className={"absolute top-1 right-1 " + buttonClass}
            tooltip="Delete image"
            onClick={(evt) => {
              field.onChange(null);

              // commit();
              evt.stopPropagation();
            }}
          >
            <CancelIcon />
          </IconButton>
          <IconButton
            className={"absolute bottom-1 left-1 cursor-pointer " + buttonClass}
            tooltip="upload"
            onClick={(evt) => {
              // field.onChange(null);
              evt.stopPropagation();
            }}
            asChild
          >
            <label>
              {input}
              <UploadIcon />
            </label>
          </IconButton>
          <img
            alt=""
            className={imgClass}
            src={
              field.value.format === "svg"
                ? field.value.url
                : square
                  ? field.value.sizes.squareThumbnail?.url
                  : field.value.sizes.thumbnail?.url
            }
          />
        </div>
      );
    }

    return (
      <label className={twMerge(contClass, "cursor-pointer")} {...dragEvents}>
        {placeholder}
        {input}
        <UploadIcon className="absolute bottom-1 left-1" />
      </label>
    );
  };
