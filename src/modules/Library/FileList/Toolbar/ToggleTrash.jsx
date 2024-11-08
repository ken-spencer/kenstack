import React from "react";

import useLibrary from "../../useLibrary";
import RecycleIcon from "@kenstack/icons/Recycle";
import ArrowBackIcon from "@kenstack/icons/ArrowBack";
import AdminIcon from "@kenstack/components/AdminIcon";

export default function ToggleTrash() {
  const { trash, setTrash } = useLibrary();

  if (trash) {
    return (
      <AdminIcon
        onClick={() => setTrash(false)}
        tooltip="Back to list"
        tooltip="Back to list"
      >
        <ArrowBackIcon />
      </AdminIcon>
    );
  } else {
    return (
      <AdminIcon
        key="view-trash"
        onClick={() => setTrash(true)}
        tooltip="View trash"
      >
        <RecycleIcon />
      </AdminIcon>
    );
  }
}
