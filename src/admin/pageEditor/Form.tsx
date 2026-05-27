"use client";
import Form from "@kenstack/forms/Form";
import Notice from "@kenstack/forms/Notice";
import { pageEditorSchema } from "./schema";
import { usePageEditor } from "./context";
import fetcher from "@kenstack/api/fetcher";

export const PageEditorForm = ({ children }: { children: React.ReactNode }) => {
  const { content } = usePageEditor();

  return (
    <Form
      mutationFn={(variables) =>
        fetcher("/api/admin", { action: "page-editor", ...variables })
      }
      onSubmit={({ event }) => event && event.preventDefault()}
      className="flex flex-col gap-4"
      schema={pageEditorSchema}
      defaultValues={content.data}
    >
      <Notice />
      {children}
    </Form>
  );
};
