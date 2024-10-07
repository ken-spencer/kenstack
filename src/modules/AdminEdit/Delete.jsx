import { useState, useEffect } from "react";

// import deleteAction from "./deleteAction";

import { useAdminEdit } from "./context";

import DeleteIcon from "@mui/icons-material/Delete";

import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import Submit from "@kenstack/forms/Submit";
// import Button from "@mui/material/Button";
import Button from "@kenstack/forms/Button";

export default function DeleteButton() {
  const [warn, setWarn] = useState(false);
  const { isNew, id, userId } = useAdminEdit();

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
      <Submit
        name="adminAction"
        value="delete"
        color="error"
        variant="contained"
        startIcon={<DeleteForeverIcon />}
      >
        Confirm
      </Submit>
    );
  }

  return (
    <Button
      type="button"
      onClick={handleDeleteClick}
      disabled={isNew || id === userId}
      variant="contained"
      startIcon={<DeleteIcon />}
    >
      Delete
    </Button>
  );
}

// formAction={deleteActionBound}
