import { remark } from "remark";
import remarkGfm from "remark-gfm";

import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import remarkBreaks from "remark-breaks";
// import { remarkShiftHeadings } from "./plugins";

export default async function mdToHtml(content: string) {
  if (!content) {
    return "";
  }

  // const preprocessedContent = content.replace(
  //   /__((?:(?!__).)+?)__/g,
  //   "<u>$1</u>",
  // );

  const processedContent = await remark()
    // .use(remarkUnderline)
    // .use(remarkShiftHeadings)
    .use(remarkGfm)
    .use(remarkBreaks) // Convert single newline to <br />    // .use(toHtml)
    .use(remarkRehype)
    // .use(remarkRehype, { allowDangerousHtml: true })
    // .use(rehypeRaw)
    // .use(rehypeSanitize, customSchema)
    .use(rehypeStringify)
    .process(content);
  return processedContent.toString();
}
