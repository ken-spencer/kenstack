import React, { useCallback } from "react";

import Button from "@admin/forms/Button";
import UploadIcon from "@mui/icons-material/Upload";

import useLibrary from "../../useLibrary";

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
    <Button disabled={trash} component="label" startIcon={<UploadIcon />}>
      Browse
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
