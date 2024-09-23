import { remark } from "remark";
import toHtml from "remark-html";

export default async function Markdown({ content, ...props} ) {
  if (!content) {
    return "";
  }

  const processedContent = await remark()
    .use(toHtml)
    .process(content);
  const html =  processedContent.toString();

  return (
    <div 
      {...props} 
      dangerouslySetInnerHTML={{__html: html }}
    />
  );
}


