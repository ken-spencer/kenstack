import { PageEditorProvider } from "./context";
import { loadContent, loadMeta, type Content } from "@kenstack/lib/loadContent";

export { loadMeta, Content };
export { TextEdit } from "./TextEdit";
export { MarkdownEdit } from "./MarkdownEdit";

import Sidebar from "./Sidebar";
export const PageEditor = async ({
  slug,
  tenant,
  defaultValues = {},
  children,
}: {
  slug: string;
  tenant?: string;
  defaultValues: Partial<Content>;
  children: React.ReactNode;
}) => {
  const content = await loadContent(slug, { tenant, defaultValues });
  return (
    <PageEditorProvider slug={slug} tenant={tenant} content={content}>
      <Sidebar>{children}</Sidebar>
    </PageEditorProvider>
  );
};
