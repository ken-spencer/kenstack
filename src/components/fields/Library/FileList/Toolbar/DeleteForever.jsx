import { useState } from "react";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import Button from "@thaumazo/forms/Button";
import useLibrary from "../../useLibrary";

import Confirm from "../../Confirm";

import deleteForeverAction from "../api/deleteForeverAction";
import { useMutation } from "@thaumazo/cms/query";

export default function DeleteForever() {
  const { selected, setError } = useLibrary();
  const [confirm, setConfirm] = useState(false);

  const mutation = useMutation(["files", null, true], deleteForeverAction, {
    onMutate: async ({ idArray }, { set, previous }) => {
      set((files) => {
        return files.filter((f) => !idArray.includes(f.id));
      });
      return { previous };
    },
    onError: ({ error, context, revert }) => {
      setError(error.message);
      revert();
    },
    onSuccess: ({ data, refetch }) => {
      if (data.error) {
        setError(data.error);
      }
      refetch();
    },
  });

  return (
    <>
      <Confirm
        confirm={confirm}
        message={`Are you certain you want to permanently delete the selected file${selected.length > 1 ? "s" : ""}?`}
        action={() => {
          mutation.mutate({ idArray: selected });
        }}
        onClose={() => {
          setConfirm(false);
        }}
      />

      <Button
        startIcon={<DeleteForeverIcon />}
        type="button"
        disabled={selected.length === 0}
        onClick={() => {
          setConfirm(true);
        }}
      >
        Delete forever
      </Button>
    </>
  );
}
