import React, { useCallback } from "react";

import Button from "@kenstack/components/AdminIcon";
import UploadIcon from "@kenstack/icons/Upload";

import { useLibrary } from "../../context";

export default function FileUpload() {
  const { accept, trash, prepareUpload } = useLibrary();

  const handleChange = useCallback(
    (evt) => {
      let input = evt.currentTarget;
      prepareUpload(input.files);
    },
    [prepareUpload],
  );

  return (
    <Button disabled={trash} component="label" tooltip="Browse files">
      <UploadIcon />
      <input
        className="hidden"
        type="file"
        name="file"
        multiple
        accept={accept.join(", ")}
        onChange={handleChange}
        disabled={trash}
      />
    </Button>
  );
}
