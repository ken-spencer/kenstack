import { remark } from "remark";
// import toHtml from "remark-html";
import remarkGfm from "remark-gfm";

import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { defaultSchema } from "hast-util-sanitize";
import rehypeRaw from "rehype-raw";
import remarkBreaks from "remark-breaks";

const customSchema = {
  ...defaultSchema,
  tagNames: [...defaultSchema.tagNames, "u"],
};

export async function mdToHtml(content) {
  if (!content) {
    return "";
  }

  const preprocessedContent = content.replace(
    /__((?:(?!__).)+?)__/g,
    "<u>$1</u>",
  );

  const processedContent = await remark()
    .use(remarkGfm)
    .use(remarkBreaks) // Convert single newline to <br />    // .use(toHtml)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, customSchema)
    .use(rehypeStringify)
    .process(preprocessedContent);
  return processedContent.toString();
}

export default async function Markdown({ content, ...props }) {
  const html = await mdToHtml(content);

  return <div {...props} dangerouslySetInnerHTML={{ __html: html }} />;
}
