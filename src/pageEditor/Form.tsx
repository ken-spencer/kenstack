import Form from "@kenstack/forms/Form";
import Notice from "@kenstack/forms/Notice";
import { pageEditorSchema, isEditableField, type ApiSchema } from "./schema";
import { usePageEditor } from "./context";
import { useRouter } from "next/navigation";

export const PageEditorForm = ({ children }: { children: React.ReactNode }) => {
  const { content, setContent, slug } = usePageEditor();
  const router = useRouter();

  return (
    <Form<{}, ApiSchema, typeof pageEditorSchema>
      apiPath="/api/page-editor"
      onSubmit={({ event }) => event && event.preventDefault()}
      className="flex flex-col gap-4"
      schema={pageEditorSchema}
      defaultValues={content}
      // onBlur={({ event, form, mutation }) => {
      //   const name = event.target.name;

      //   if (isEditableField(name)) {
      //     const value = form.getValues(name);
      //     if (value && content[name] !== value) {
      //       setContent({ ...content, [name]: value });
      //       mutation.mutateAsync({ slug, field: name, value }).then((res) => {
      //         if (res.status === "success") {
      //           router.refresh();
      //         }
      //       });
      //     }
      //   }
      // }}
    >
      <Notice />
      {children}
    </Form>
  );
};
