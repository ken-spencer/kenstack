import { remark } from "remark";
import toHtml from "remark-html";
import remarkGfm from "remark-gfm";

export default async function Markdown({ content, ...props }) {
  if (!content) {
    return "";
  }

  const processedContent = await remark()
    .use(remarkGfm)
    .use(toHtml)
    .process(content);
  const html = processedContent.toString();

  return <div {...props} dangerouslySetInnerHTML={{ __html: html }} />;
}
