"use client";

import React, { useCallback, useState } from "react";

import Button from "@kenstack/forms/Button";
import UploadIcon from "@kenstack/icons/Upload";

import apiAction from "@kenstack/client/apiAction";

async function readFile(file) {
  return new Promise((success, error) => {
    let reader = new FileReader();
    reader.onload = () => {
      success(reader.result);
    };
    reader.onerror = () => {
      error(reader.error);
    };
    reader.readAsDataURL(file);
  });
}

export default function FileUpload({
  disabled = false,
  accept = "image/png, image/jpeg, image/jpg, image/gif, image/svg+xml, image/webp",
  name,
  apiPath,
  invalidateQueries,
}) {
  const [loading, setLoading] = useState(false);

  const handleChange = useCallback(
    (evt) => {
      let input = evt.currentTarget;
      const file = input.files[0];
      readFile(file).then((f) => {
        const formData = new FormData();
        formData.append("action", "image-upload");
        formData.append("name", name);
        formData.append("file", file);
        setLoading(true);
        apiAction(apiPath, formData, { invalidateQueries }).finally(() => {
          setLoading(false);
        });
      });
    },
    [invalidateQueries],
  );

  return (
    <Button
      loading={loading}
      disabled={disabled}
      component="label"
      startIcon={<UploadIcon />}
    >
      Browse
      <input
        className="hidden"
        type="file"
        name="file"
        // multiple
        accept={accept}
        onChange={handleChange}
        disabled={loading || disabled}
      />
    </Button>
  );
}
