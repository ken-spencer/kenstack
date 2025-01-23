import { useState } from "react";

import DeleteForeverIcon from "@kenstack/icons/DeleteForever";
import AdminIcon from "@kenstack/components/AdminIcon";

import { useLibrary } from "../../context";

import Confirm from "../../Confirm";

import apiAction from "@kenstack/client/apiAction";

import useMutation from "@kenstack/hooks/useMutation";

export default function DeleteForever() {
  const { selected, setSelected, addMessage, apiPath } = useLibrary();
  const [confirm, setConfirm] = useState(false);

  const mutation = useMutation({
    queryKey: ["files", null, true],
    mutationFn: (post) => apiAction(apiPath + "/delete-forever", post),
    onMutate: async ({ idArray }, { set, previous }) => {
      set((data) => {
        return { files: data.files.filter((f) => !idArray.includes(f.id)) };
      });
      setSelected([]);
      return { previous, selected };
    },
    onError: ({ error, context }) => {
      setSelected(context.selected);
      addMessage({ error: error.message });
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

      <AdminIcon
        disabled={selected.length === 0}
        onClick={() => {
          setConfirm(true);
        }}
        tooltip="Delete forever"
      >
        <DeleteForeverIcon />
      </AdminIcon>
    </>
  );
}
