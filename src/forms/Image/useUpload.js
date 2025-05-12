import { useCallback, useMemo, useState } from "react";
import { useForm } from "../context";
import apiAction from "@kenstack/client/apiAction";

export default function useUpload(field) {
  const [src, setSrc] = useState();

  const apiPath = useForm((state) => state.apiPath);
  const addMessage = useForm((state) => state.addMessage);
  const setUploading = useForm((state) => state.setUploading);

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
        addMessage({ error: "Reader error:" + reader.error });
      };
      reader.readAsDataURL(file);

      const res = await apiAction(apiPath + "/get-presigned-url", {
        filename: file.name,
        type: file.type,
        name: field.name,
      });

      if (res.error) {
        addMessage({
          // error: `There was an unexpected problem uploading ${file.name}:  ${res.error}`,
          error: res.error,
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
        sizes = {};
      // thumbnailUrl, squareUrl;
      if (data.format !== "svg") {
        // note, if this is unreliable, we are can return the order fro the presigned api
        ["original", "thumbnail", "squareThumbnail"].forEach((name, key) => {
          let size = data.eager[key];
          sizes[name] = {
            url: size.secure_url,
            width: size.width,
            height: size.height,
          };
        });

        // const [og, thumb, square] = data.eager;
        // url = og.secure_url;
        // thumbnailUrl = square.secure_url;
        // squareUrl = thumb.secure_url;
      }

      field.setValue({
        upload: true,
        format: data.format,
        filename: file.name,
        url,
        sizes,
        // thumbnailUrl,
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

        const dt = evt.dataTransfer;
        // cont[file] = dt.files ?? [];
        if (dt.files?.length) {
          uploadFile(dt.files[0]);
        }
      },
    }),
    [uploadFile],
  );

  return { uploadFile, dragEvents, reset, src, setSrc };
}
