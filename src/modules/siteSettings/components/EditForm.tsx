import { ImageField, InputField } from "@kenstack/admin/forms";

export default function EditForm() {
  return (
    <div className="max-w-2xl space-y-4">
      <InputField
        help="The default title shown in the browser tab and in search results when a title has not been specified for a page."
        label="Title"
        name="title"
      />
      <InputField
        help='Automatically adds text to the page title, for example your site name. "%s | My Site" would appear as "Page Title | My Site".'
        label="Title Template"
        name="titleTemplate"
      />
      <ImageField
        help="The default image shown in social media and messaging app previews when an image has not been specified for a page."
        label="Open Graph Image (1200 x 630)"
        name="ogImage"
      />
    </div>
  );
}
