import AdminIcon from "@kenstack/components/AdminIcon";
import DeleteIcon from "@kenstack/icons/Delete";
import RestoreFromTrashIcon from "@kenstack/icons/Undelete";

import { useLibrary } from "../../context";

import useMutation from "@kenstack/hooks/useMutation";
import apiAction from "@kenstack/client/apiAction";

export default function Delete() {
  const { apiPath, addMessage, selected, setSelected, activeFolder, trash } =
    useLibrary();

  const deleteMutation = useMutation({
    queryKey: ["files", activeFolder, trash],
    mutationFn: (post) => apiAction(apiPath + "/delete-files", post),
    onMutate: async ({ idArray }, { set, previous }) => {
      set((data) => data.files.filter((f) => !idArray.includes(f.id)));
      setSelected([]);
      return { previous, selected };
    },
    onError: ({ error, context }) => {
      setSelected(context.selected);
      addMessage({ error: error.message });
    },
  });

  if (trash) {
    return (
      <AdminIcon
        disabled={selected.length === 0}
        onClick={() => {
          deleteMutation.mutate({ idArray: selected, trash });
        }}
        tooltip="Undelete"
      >
        <RestoreFromTrashIcon />
      </AdminIcon>
    );
  }

  return (
    <AdminIcon
      tooltip="Delete"
      disabled={selected.length === 0}
      onClick={() => {
        deleteMutation.mutate({ idArray: selected, trash });
      }}
    >
      <DeleteIcon />
    </AdminIcon>
  );
}
