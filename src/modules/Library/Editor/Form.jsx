import Form from "@kenstack/forms/Form";
import Input from "@kenstack/forms/Input";

import { useLibraryEditor } from "./context";
import apiAction from "@kenstack/client/apiAction";
import defaultError from "@kenstack/defaultError";

import useMutation from "@kenstack/hooks/useMutation";
import { useQueryClient } from "@tanstack/react-query";

export default function EditForm({ file }) {
  const { id, apiPath, addMessage } = useLibraryEditor();

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
    onSuccess: ({ queryClient }) => {
      queryClient.invalidateQueries({ queryKey: ["editor", id] });
    },
  });

  return (
    <section className="admin-border h-full p-2" header="Details">
      <Form className="flex flex-wrap gap-4" values={file}>
        <Input
          name="alt"
          label="Alternate text"
          //defaultValue={file.alt}
          onBlur={(evt) => {
            mutation.mutate({
              action: "field",
              name: "alt",
              value: evt.target.value,
            });
          }}
        />
      </Form>
    </section>
  );
}
