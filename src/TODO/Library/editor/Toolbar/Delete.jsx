import Button from "@kenstack/forms/Button";
import DeleteIcon from "@mui/icons-material/Delete";
// import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";

import useLibrary from "../../useLibrary";

import { useMutation } from "@kenstack/query";
import deleteAction from "../../FileList/api/deleteAction";

export default function Delete() {
  const { edit, setEdit, activeFolder, setError } = useLibrary();
  const deleteMutation = useMutation(
    ["files", activeFolder, false],
    deleteAction,
    {
      onMutate: async ({ idArray }, { set, previous }) => {
        set((files) => files.filter((f) => !idArray.includes(f.id)));
        setEdit(null);

        return { previous, edit };
      },
      onError: ({ error, context, selected, revert }) => {
        revert();
        setEdit(context.edit);
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

  return (
    <Button
      startIcon={<DeleteIcon />}
      type="button"
      // disabled={}
      onClick={() => {
        deleteMutation.mutate({ idArray: [edit], trash: false });
      }}
    >
      Delete
    </Button>
  );
}
