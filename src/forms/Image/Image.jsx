import { useMemo, useCallback, useState } from "react";
import useField from "../useField";
import { useAdminEdit } from "@kenstack/modules/AdminEdit/context";
import { useForm } from "../context";

import apiAction from "@kenstack/client/apiAction";

import AddImageIcon from "@kenstack/icons/AddImage";
import ProgressIcon from "@kenstack/icons/Progress";
import CancelIcon from "@kenstack/icons/Cancel";
import Field from "../Field";

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

export default function ImageField(initialProps) {
  const { field, fieldProps } = useField(initialProps);
  const { apiPath } = useAdminEdit();
  const addMessage = useForm((state) => state.addMessage);
  const uploading = useForm((state) => state.uploading);
  const setUploading = useForm((state) => state.setUploading);
  const [src, setSrc] = useState();

  // useEffect(() => {
  //   field.setValue({
  //     url: "https://res.cloudinary.com/kenstackcms/image/upload/f_webp/v1740506881/test/images/fzns2vh7eg68beg/photo.webp",
  //     thumbnailUrl: "https://res.cloudinary.com/kenstackcms/image/upload/w_200,h_200,c_thumb,g_center,f_webp/v1740506881/test/images/fzns2vh7eg68beg/photo.webp",
  //   })
  // }, [])

  const reset = useCallback(() => {
    setSrc("");
    setUploading((val) => {
      const newUploading = new Set(val);
      newUploading.delete(field.name);
      return newUploading;
    });
  }, [field, setUploading]);

  const uploadFile = useCallback(
    async (file) => {
      if (!file) {
        return;
      }

      setUploading((val) => {
        const newUploading = new Set(val);
        newUploading.add(field.name);
        return newUploading;
      });
      // Must be five megabytes or smaller.
      if (file.size > 5 * 1024 ** 2) {
        // const size = file.size / 1024 ** 2;
        // const sizeStr = size.toFixed(1);
        reset();
        addMessage({ error: "Maximum image size is 5 megabytes." });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setSrc(reader.result);
      };
      reader.onerror = () => {
        addMessage({ error: reader.error });
      };
      reader.readAsDataURL(file);

      const res = await apiAction(apiPath + "/get-presigned-url", {
        filename: file.name,
        type: file.type,
      });
      if (res.error) {
        addMessage({
          error: `There was an unexpected problem uploading ${file.name}:  ${res.error}`,
        });
        reset();
        return;
      }

      const { uploadUrl, fields } = res;
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) =>
        formData.append(key, value),
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
        addMessage({ error: e.message });
        reset();
      }
      const data = await uploadRes.json();

      if (data.error) {
        addMessage({
          error: `There was an unexpected problem loading ${file.name}:  ${data.error.message}`,
        });
        reset();
        return;
      }

      let url = data.secure_url,
        thumbnailUrl;
      if (data.format !== "svg") {
        const [og, thumb] = data.eager;
        url = og.secure_url;
        thumbnailUrl = thumb.secure_url;
      }

      field.setValue({
        upload: true,
        formata: data.format,
        filename: file.name,
        url,
        thumbnailUrl,
        data,
      });

      setUploading((val) => {
        const newUploading = new Set(val);
        newUploading.delete(field.name);
        return newUploading;
      });
    },
    [apiPath, reset, field, addMessage, setUploading],
  );

  const dragEvents = useMemo(
    () => ({
      onDragEnter: (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
      },
      onDragOver: (evt) => {
        evt.preventDefault();
        evt.stopPropagation();

        var dt = evt.dataTransfer;
        if (dt.getData("action") === "moveFile") {
          dt.effectAllowed = dt.dropEffect = "none";
        }
      },
      onDrop: (evt) => {
        evt.preventDefault();
        evt.stopPropagation();

        var dt = evt.dataTransfer;
        // prepareUpload(dt.files);
        cont[file] = dt.files ?? [];
        uploadFile(file);
      },
    }),
    [uploadFile],
  );

  const imageClass =
    "relative flex items-center justify-center w-24 h-24 bg-gray-300 overflow-hidden dark:bg-gray-600";
  return (
    <Field field={field} {...fieldProps}>
      {(() => {
        if (uploading.has(field.name)) {
          return (
            <div className={imageClass}>
              {src && (
                <img
                  className="object-cover object-center w-full h-full"
                  src={src}
                  alt=""
                />
              )}
              <button
                className="absolute right-1 top-1 bg-black bg-opacity-40 rounded-full"
                type="button"
                onClick={() => {
                  reset();
                }}
              >
                <CancelIcon />
              </button>
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
            <div className={imageClass + " cursor-pointer"} {...dragEvents}>
              <button
                className="absolute right-1 top-1 bg-black bg-opacity-40 rounded-full"
                type="button"
                onClick={(evt) => {
                  field.setValue(null);
                  evt.stopPropagation();
                }}
              >
                <CancelIcon />
              </button>
              <img
                alt=""
                className="object-cover object-center w-full h-full"
                src={
                  field.value.format === "svg"
                    ? field.value.url
                    : field.value.thumbnailUrl
                }
              />
            </div>
          );
        }

        return (
          <label className={imageClass + " cursor-pointer"} {...dragEvents}>
            <AddImageIcon className="w-16 h-16" />
            <input
              className="sr-only"
              type="file"
              accept={acceptStr}
              onChange={(evt) => {
                const input = evt.currentTarget;
                uploadFile(input.files[0]);
                input.value = "";
              }}
            />
          </label>
        );
      })()}
    </Field>
  );
}
