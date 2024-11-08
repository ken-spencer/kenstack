import AdminIcon from "@kenstack/components/AdminIcon";
import DeleteIcon from "@kenstack/icons/Delete";
// import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";

import useLibrary from "../../useLibrary";

import useMutation from "@kenstack/hooks/useMutation";
// import deleteAction from "../../FileList/api/deleteAction";
import apiAction from "@kenstack/client/apiAction";

export default function Delete() {
  const { edit, setEdit, activeFolder, setError } = useLibrary();
  const deleteMutation = useMutation(
    ["files", activeFolder, false],
    // deleteAction,
    () => {
      console.log("TODO Delete action goes here");
    },
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
    <AdminIcon
      // disabled={}
      onClick={() => {
        deleteMutation.mutate({ idArray: [edit], trash: false });
      }}
      tooltip="Delete"
    >
      <DeleteIcon />
    </AdminIcon>
  );
}
