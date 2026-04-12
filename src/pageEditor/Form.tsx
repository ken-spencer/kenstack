"use client";
import Form from "@kenstack/forms/Form";
import Notice from "@kenstack/forms/Notice";
import { pageEditorSchema, type ApiSchema } from "./schema";
import { usePageEditor } from "./context";

export const PageEditorForm = ({ children }: { children: React.ReactNode }) => {
  const { content } = usePageEditor();

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
