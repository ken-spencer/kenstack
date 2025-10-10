import pick from "lodash-es/pick";
import { useCallback, useState } from "react";

import fetcher from "@kenstack/lib/fetcher";

import AddImageIcon from "./AddImageIcon";
import ProgressIcon from "@kenstack/icons/Progress";
import { Upload as UploadIcon, X as CancelIcon } from "lucide-react";

import { twMerge } from "tailwind-merge";
import Field, { type FieldProps } from "@kenstack/forms/Field";
import IconButton from "@kenstack/components/IconButton";
import { useForm } from "@kenstack/forms/context";

import acceptDefault from "@kenstack/forms/ImageField/accept";

const buttonClass =
  "size-6 bg-gray-200/60  hover:bg-gray-400 border rounded-full";

type ImageRenderProps = {
  square?: boolean;
  apiPath?: string;
  setStatusMessage?: (message) => void;
  placeholder?: React.ReactNode;
  imageClass?: string;
  accept?: string[];
};

type PresignedFetchResult = {
  uploadUrl: string;
  fields: Record<string, string | number | boolean | null>;
  transformations: string[];
};

type UploadFieldProps = FieldProps &
  React.ComponentProps<"div"> &
  ImageRenderProps;

export default function ImageField({
  name,
  label,
  description,
  ...props
}: UploadFieldProps) {
  const { apiPath, setStatusMessage } = useForm();

  return (
    <Field
      name={name}
      label={label}
      description={description}
      render={imageRender({ apiPath, ...props, setStatusMessage })}
    />
  );
}

const imageRender = ({
  square = false,
  apiPath,
  setStatusMessage,
  placeholder = <AddImageIcon className="h-16 w-16 text-gray-600" />,
  imageClass,
  accept = acceptDefault,
}: ImageRenderProps) =>
  function ImageFieldRender({ field }) {
    const acceptStr = accept.join(", ");
    const contClass = twMerge(
      "relative flex items-center justify-center",
      square ? "overflow-hidden w-32 h-32" : "w-max h-max w-32 max-h-32 "
    );
    const imgClass = twMerge(
      square
        ? "object-cover object-center w-full h-full"
        : "object-scale-down object-center w-full h-full",
      imageClass
    );

    const [uploading, setUploading] = useState(false);
    const [src, setSrc] = useState<string>("");

    const reset = useCallback(() => {
      setSrc("");
      setUploading(false);
    }, []);

    const uploadFile = async (file) => {
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

      const res = await fetcher<PresignedFetchResult>(
        apiPath + "/get-presigned-url",
        {
          filename: file.name,
          type: file.type,
          name: field.name,
        }
      );

      if ("error" === res.status) {
        setStatusMessage({
          status: "error",
          message: res.message,
        });
        reset();
        return;
      }

      const { uploadUrl, fields, transformations } = res;
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) =>
        formData.append(key, String(value))
      );
      formData.append("file", file);

      let uploadRes;
      try {
        uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            Accept: "application/json", // Request a JSON response from Cloudinary
          },
          body: formData,
        });
      } catch (e) {
        setStatusMessage({ status: "error", message: e.message });
        reset();
      }
      const data = await uploadRes.json();

      if (data.error) {
        setStatusMessage({
          status: "error",
          message: `There was an unexpected problem loading ${file.name}:  ${data.error.message}`,
        });
        reset();
        return;
      }

      const retval = {
        filename: file.name,
        ...pick(data, [
          "asset_id",
          "public_id",
          "version",
          "version_id",
          "width",
          "height",
          "format",
          "bytes",
          "asset_folder",
          "display_name",
          "original_filename",
        ]),
        url: data.secure_url,
        sizes: {},
      };

      if (data.format !== "svg") {
        transformations.forEach((sizeName, key) => {
          const size = data.eager[key];

          retval.sizes[sizeName] = {
            width: size.width,
            height: size.height,
            format: size.format,
            bytes: size.bytes,
            url: size.secure_url,
            transformation: size.transformation,
          };
        });
      }

      field.onChange(retval);
      setUploading(false);
      // commit();
    };

    const dragEvents = {
      onDragEnter: (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
      },
      onDragOver: (evt) => {
        evt.preventDefault();
        evt.stopPropagation();

        const dt = evt.dataTransfer;
        if (dt.getData("action") === "moveFile") {
          dt.effectAllowed = dt.dropEffect = "none";
        }
      },
      onDrop: (evt) => {
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
        onChange={(evt) => {
          const target = evt.currentTarget;
          uploadFile(target.files[0]);
          target.value = "";
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
