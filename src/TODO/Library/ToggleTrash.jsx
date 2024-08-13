import React from "react";

import Button from "@kenstack/forms/Button";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import useLibrary from "./useLibrary";

export default function ToggleTrash() {
  const { trash, setTrash } = useLibrary();

  if (trash) {
    return (
      <Button
        startIcon={<ArrowBackIcon />}
        key="exit-trash"
        type="button"
        onClick={() => setTrash(false)}
      >
        Back to list
      </Button>
    );
  } else {
    return (
      <Button
        startIcon={<RestoreFromTrashIcon />}
        key="view-trash"
        type="button"
        onClick={() => setTrash(true)}
      >
        View trash
      </Button>
    );
  }
}
