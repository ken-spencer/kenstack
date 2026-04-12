import { Suspense } from "react";
import { PageEditorProvider } from "./context";
import {
  loadContent,
  loadMeta,
  type Content,
  type DefaultValues,
} from "./loadContent";

export { loadMeta, Content, DefaultValues };
export { TextEdit } from "./TextEdit";
export { MarkdownEdit } from "./MarkdownEdit";

type Props = {
  slug: string;
  tenant?: string;
  defaultValues: DefaultValues;
  children: React.ReactNode;
};
export { default as PageEditorSettings } from "./Settings";

export const PageEditor = (props: Props) => {
  return (
    <Suspense>
      <PageEditorAsync {...props} />
    </Suspense>
  );
};

export const PageEditorAsync = async ({
  slug,
  tenant,
  defaultValues = {},
  children,
}: Props) => {
  "use cache";
  const content = await loadContent(slug, { tenant, defaultValues });
  return (
    <PageEditorProvider slug={slug} tenant={tenant} content={content}>
      {children}
    </PageEditorProvider>
  );
};
