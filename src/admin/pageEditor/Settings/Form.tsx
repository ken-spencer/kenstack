import { useRouter } from "next/navigation";
import Form from "@kenstack/forms/Form";
import ImageField from "@kenstack/forms/ImageField";
import InputField from "@kenstack/forms/InputField";
import Submit from "@kenstack/forms/Submit";
import TextareaField from "@kenstack/forms/TextareaField";
import { pageEditorSettingsSchema } from "../schema";

import { usePageEditor } from "../context";

export default function PageEditorSidebarForm() {
  const router = useRouter();
  const { content, slug } = usePageEditor();

  return (
    <Form
      apiPath="/api/admin"
      className="space-y-4"
      schema={pageEditorSettingsSchema}
      defaultValues={{
        seoTitle: content.data.seoTitle,
        seoDescription: content.data.seoDescription,
        ogImage: content.data.ogImage,
      }}
      onSubmit={({ data, mutation, changes }) => {
        mutation.mutate({
          action: "page-editor",
          changes,
          slug,
          values: data,
        });
      }}
      onSuccess={() => {
        router.refresh();
      }}
    >
      <InputField
        label="Title"
        name="seoTitle"
        description="If different than the page title"
        placeholder={content.data.title}
      />
      <TextareaField
        label="Description"
        name="seoDescription"
        cols={3}
        placeholder={content.data.description}
      />
      <ImageField
        apiPath="/api/admin"
        label="Open Graph Image"
        name="ogImage"
        presignedUrlAction="page-editor-get-presigned-url"
        uploadCompleteAction="page-editor-upload-complete"
      />
      <Submit disabledUntilDirty>Save Settings</Submit>
    </Form>
  );
}
