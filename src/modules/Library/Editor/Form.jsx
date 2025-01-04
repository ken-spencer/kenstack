import Form from "@kenstack/forms/Form";
import Input from "@kenstack/forms/Input";

import { useLibraryEditor } from "./context";
import apiAction from "@kenstack/client/apiAction";

import useMutation from "@kenstack/hooks/useMutation";
import { useQueryClient } from "@tanstack/react-query";

import formData from "./formData";

export default function EditForm({ file }) {
  const { id, apiPath, addMessage } = useLibraryEditor();
  const store = formData.createStore({ values: file });

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (post) => apiAction(apiPath + "/save-edit", { id, ...post }),
    onMutate: ({ action, name, value }) => {
      if (action === "field") {
        queryClient.setQueryData(["editor", id], {
          file: { ...file, [name]: value },
        });
      }
    },
    onError: ({ error }) => {
      addMessage({ error: error.message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editor", id] });
    },
  });

  return (
    <section className="admin-border h-full p-2" header="Details">
      <Form
        className="flex flex-wrap gap-4"
        store={store}
        onBlur={(evt) => {
          const input = evt.target;
          const { name, value } = input;
          const changed = store.getState().changed;
          if (changed) {
            mutation.mutate({
              action: "field",
              name,
              value,
            });
          }
        }}
      >
        <Input name="alt" label="Alternate text" />
      </Form>
    </section>
  );
}
