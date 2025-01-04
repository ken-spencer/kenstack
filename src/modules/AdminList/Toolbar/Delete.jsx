import DeleteIcon from "@kenstack/icons/Delete";
import Button from "@kenstack/forms/Button";
import { useAdminList } from "../context";
import { useMutation } from "@kenstack/query";
import apiAction from "@kenstack/client/apiAction";

export default function Delete() {
  const { queryKey, apiPath, selected, setSelected, messageStore } =
    useAdminList();

  const mutation = useMutation({
    queryKey,
    successKey: ["admin-list"],
    store: messageStore,
    mutationFn: (selectedPost) =>
      apiAction(apiPath + "/delete", [...selectedPost]),
    onMutate: async (selectedPost, { set }) => {
      setSelected(new Set());
      set((data) => ({
        rows: data.rows.filter((f) => !selectedPost.has(f._id)),
      }));
      return { selected: selectedPost };
    },
    onError: ({ error, context }) => {
      setSelected(context.selected);
      // addMessage({ error: error.message });
    },
  });

  return (
    <Button
      type="button"
      onClick={() => mutation.mutate(selected)}
      // disabled={isNew || id === userId}
      variant="contained"
      startIcon={<DeleteIcon />}
    >
      Delete {selected.size}
    </Button>
  );
}
