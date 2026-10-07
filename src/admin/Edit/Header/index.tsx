"use client";
import SeoDialog, {
  SeoDialogSection,
} from "@kenstack/admin/components/SeoDialog";
import { defineFields } from "@kenstack/admin/fields";
import { metaFieldOptions } from "@kenstack/admin/metaFields";
import { defineFormFields } from "@kenstack/fields/formFields";
import { useAdminEdit } from "../context";
import DeleteButton, { RestoreButton } from "./DeleteButton";
import EditToolbar from "./EditToolbar";
import ListButton from "./ListButton";
import NewButton from "./NewButton";
import PreviewButton from "./PreviewButton";
import RevisionHistoryButton from "./RevisionHistoryButton";
import SaveButton from "./SaveButton";
import SwitchUserButton from "./SwitchUserButton";

// Editors for the generated SEO fields the dialog renders.
const metaFormFields = defineFormFields(
  defineFields({
    fields: {
      seoTitle: metaFieldOptions.seoTitle,
      seoDescription: metaFieldOptions.seoDescription,
      ogImage: metaFieldOptions.ogImage,
    },
  }),
);
const seoFieldNames = Object.keys(metaFormFields);

export default function AdminEditHeader() {
  const { hasSeoDialog } = useAdminEdit();

  return (
    <EditToolbar
      end={
        <>
          {hasSeoDialog ? (
            <SeoDialog names={seoFieldNames}>
              <SeoDialogSection
                help="Shown in search results. Leave empty to use the page's own title and description."
                title="Search results"
              >
                <metaFormFields.seoTitle />
                <metaFormFields.seoDescription />
              </SeoDialogSection>
              <SeoDialogSection
                help="The image shown when this page is shared in social media and messaging apps. Leave empty to use the site default. 1200 × 630 pixels works best."
                title="Link previews"
              >
                <metaFormFields.ogImage />
              </SeoDialogSection>
            </SeoDialog>
          ) : null}
          <PreviewButton />
          <SwitchUserButton />
          <RevisionHistoryButton />
          <RestoreButton />
          <DeleteButton />
        </>
      }
    >
      <NewButton />
      <ListButton />
      <SaveButton />
    </EditToolbar>
  );
}
