// import { useRouter } from "next/navigation";
// import {
//   // pageEditorSchema,
//   // isEditableField,
//   // type PageContent,
//   // type ApiSchema,
// } from "../schema";
// import Form from "@kenstack/forms/Form";
import { useCommit } from "../context";
import InputField from "@kenstack/forms/InputField";
import TextareaField from "@kenstack/forms/TextareaField";
// import Notice from "@kenstack/forms/Notice";

import { PageEditorForm } from "../Form";
import { usePageEditor } from "../context";

export default function PageEditorSidebarForm() {
  // const router = useRouter();
  return (
    // <Form<{}, ApiSchema, typeof pageEditorSchema>
    //   apiPath="/api/page-editor"
    //   onSubmit={({ event }) => event && event.preventDefault()}
    //   className="flex flex-col gap-4"
    //   schema={pageEditorSchema}
    //   defaultValues={content}
    //   onBlur={({ event, form, mutation }) => {
    //     const name = event.target.name;
    //     if (isEditableField(name)) {
    //       const value = form.getValues(name);
    //       if (value && content[name] !== value) {
    //         mutation.mutateAsync({ slug, field: name, value }).then((res) => {
    //           if (res.status === "success") {
    //             router.refresh();
    //           }
    //         });
    //       }
    //     }
    //   }}
    // >
    //   <Notice />
    <PageEditorForm>
      <Fields />
    </PageEditorForm>
  );
}

const Fields = () => {
  const commit = useCommit();
  const { content } = usePageEditor();

  return (
    <>
      <InputField
        label="Title"
        name="seoTitle"
        description="If different than the page title"
        placeholder={content.title}
        onBlur={() => commit("seoTitle")}
      />

      <TextareaField
        label="Description"
        name="seoDescription"
        cols={3}
        placeholder={content.description}
        onBlur={() => commit("seoDescription")}
      />
    </>
  );
};
