import { remark } from "remark";
import remarkGfm from "remark-gfm";
import type { PluggableList } from "unified";

import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkBreaks from "remark-breaks";

export type MarkdownOptions = {
  remarkPlugins?: PluggableList;
};

export default async function mdToHtml(
  content: string,
  options: MarkdownOptions = {},
) {
  if (!content) {
    return "";
  }

  const processor = remark().use(remarkGfm).use(remarkBreaks);

  if (options.remarkPlugins?.length) {
    processor.use(options.remarkPlugins);
  }

  const processedContent = await processor
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(content);
  return processedContent.toString();
}
