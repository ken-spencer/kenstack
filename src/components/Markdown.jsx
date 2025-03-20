import { remark } from "remark";
import toHtml from "remark-html";
import remarkGfm from "remark-gfm";

export async function mdToHtml(content) {
  if (!content) {
    return "";
  }

  const processedContent = await remark()
    .use(remarkGfm)
    .use(toHtml)
    .process(content);
  return processedContent.toString();
}

export default async function Markdown({ content, ...props }) {
  const html = await mdToHtml(content);

  return <div {...props} dangerouslySetInnerHTML={{ __html: html }} />;
}
