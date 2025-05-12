import useField from "../useField";
import { useForm } from "../context";

import AddImageIcon from "@kenstack/icons/AddImage";
import ProgressIcon from "@kenstack/icons/Progress";
import CancelIcon from "@kenstack/icons/Cancel";
import UploadIcon from "@kenstack/icons/Upload";
import Field from "../Field";
import Button from "./Button";

import useUpload from "./useUpload";

const accept = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/heic",
  "image/heif",
];
const acceptStr = accept.join(", ");

export default function ImageField({ square = true, ...initialProps }) {
  const { field, fieldProps } = useField(initialProps);
  const uploading = useForm((state) => state.uploading);

  const { uploadFile, dragEvents, reset, src } = useUpload(field);
  const contClass =
    "relative flex items-center justify-center w-24 h-24 bg-gray-300 overflow-hidden dark:bg-gray-600";
  const imgClass = square
    ? "object-cover object-center w-full h-full"
    : "object-scale-down object-center w-full h-full";

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
  return (
    <Field {...fieldProps}>
      {(() => {
        if (uploading.has(field.name)) {
          return (
            <div className={contClass}>
              {src && <img className={imgClass} src={src} alt="" />}
              <Button
                className="absolute right-1 top-1"
                tooltip="Cancel"
                onClick={() => {
                  reset();
                }}
              >
                <CancelIcon />
              </Button>
              <div className="absolute inset-0 m-auto w-12 h-12 bg-black bg-opacity-40 rounded-full">
                <ProgressIcon
                  className="w-12 h-12 text-gray-100 animate-spin"
                  style={{ animationDuration: "2s" }}
                />
              </div>
            </div>
          );
        }

        if (field.value) {
          return (
            <div className={contClass + " cursor-pointer"} {...dragEvents}>
              <Button
                className="absolute right-1 top-1"
                tooltip="Delete image"
                onClick={(evt) => {
                  field.setValue(null);
                  evt.stopPropagation();
                }}
              >
                <CancelIcon />
              </Button>
              <Button
                className="absolute left-1 bottom-1"
                tooltip="upload"
                component="label"
                // onClick={(evt) => {
                //   field.setValue(null);
                //   evt.stopPropagation();
                // }}
              >
                {input}
                <UploadIcon />
              </Button>
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
          <label className={contClass + " cursor-pointer"} {...dragEvents}>
            <AddImageIcon className="w-16 h-16" />
            {input}
          </label>
        );
      })()}
    </Field>
  );
}

ImageField.defaultValue = null;
