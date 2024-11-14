import { useState, useEffect } from "react";
import { useFormStatus } from "react-dom";

import { useAdminEdit } from "./context";

import AdminIcon from "@kenstack/components/AdminIcon";
import DeleteIcon from "@kenstack/icons/Delete";
import DeleteForeverIcon from "@kenstack/icons/DeleteForever";

export default function DeleteButton() {
  const [warn, setWarn] = useState(false);
  const { isNew, id, userId } = useAdminEdit();

  const { pending } = useFormStatus();
  useEffect(() => {
    if (!warn) {
      return;
    }

    const timeout = setTimeout(() => {
      setWarn(false);
    }, 5000);
    return () => {
      clearTimeout(timeout);
    };
  }, [warn]);

  // const arg = { id, pathName, modelName: admin.modelName };
  // const deleteActionBound = deleteAction.bind(null, arg);
  const handleDeleteClick = () => {
    setWarn(true);
  };

  if (warn) {
    return (
      <AdminIcon
        type="submit"
        disabled={pending}
        name="adminAction"
        value="delete"
        color="error"
        tooltip="Confirm delete"
      >
        <DeleteForeverIcon className="text-red-500" />
      </AdminIcon>
    );
  }

  return (
    <AdminIcon
      type="button"
      onClick={handleDeleteClick}
      disabled={isNew || id === userId}
      tooltip="Delete"
    >
      <DeleteIcon />
    </AdminIcon>
  );
}

// formAction={deleteActionBound}
