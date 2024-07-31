import Button from "@thaumazo/forms/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";

import useLibrary from "../../useLibrary";

import { useMutation } from "@admin/query";
import deleteAction from "../api/deleteAction";

export default function Delete() {
  const { selected, setSelected, activeFolder, trash, setError } = useLibrary();
  const deleteMutation = useMutation(
    ["files", activeFolder, trash],
    deleteAction,
    {
      onMutate: async ({ idArray }, { set, previous }) => {
        set((files) => files.filter((f) => !idArray.includes(f.id)));
        setSelected([]);

        return { previous, selected };
      },
      onError: ({ error, context, selected, revert }) => {
        revert();
        setSelected(context.selected);
        setError(error.message);
      },
      onSuccess: ({ data, refetch }) => {
        if (data.error) {
          setError(data.error);
        }
        refetch();
      },
    },
  );

  if (trash) {
    return (
      <Button
        startIcon={<RestoreFromTrashIcon />}
        type="button"
        disabled={selected.length === 0}
        onClick={() => {
          deleteMutation.mutate({ idArray: selected, trash });
        }}
      >
        Undelete
      </Button>
    );
  }

  return (
    <Button
      startIcon={<DeleteIcon />}
      type="button"
      disabled={selected.length === 0}
      onClick={() => {
        deleteMutation.mutate({ idArray: selected, trash });
      }}
    >
      Delete
    </Button>
  );
}
