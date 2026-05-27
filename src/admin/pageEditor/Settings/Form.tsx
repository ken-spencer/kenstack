import { useRouter } from "next/navigation";
import fetcher from "@kenstack/api/fetcher";
import Form from "@kenstack/forms/Form";
import ImageField from "@kenstack/forms/ImageField";
import InputField from "@kenstack/forms/InputField";
import Notice from "@kenstack/forms/Notice";
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
      mutationFn={(variables) =>
        fetcher("/api/admin", {
          action: "page-editor",
          ...variables,
        })
      }
      onSubmit={({ data, mutation, changes }) => {
        return mutation.mutateAsync({
          changes,
          slug,
          values: data,
        });
      }}
      onSuccess={() => {
        router.refresh();
      }}
    >
      <Notice />
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
