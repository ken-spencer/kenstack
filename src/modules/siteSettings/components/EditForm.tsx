"use client";

import { defineFormFields } from "@kenstack/fields/formFields";
import { fields as definitions } from "../fields";

const fields = defineFormFields(definitions);

export default function EditForm() {
  return (
    <div className="max-w-2xl space-y-4">
      <fields.title help="The default title shown in the browser tab and in search results when a title has not been specified for a page." />
      <fields.titleTemplate help='Automatically adds text to the page title, for example your site name. "%s | My Site" would appear as "Page Title | My Site".' />
      <fields.ogImage help="The default image shown in social media and messaging app previews when an image has not been specified for a page." />
    </div>
  );
}
