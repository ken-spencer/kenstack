"use client";
import { twMerge } from "tailwind-merge";
import { useEffect, useState } from "react";
import { remark } from "remark";
import remarkGfm from "remark-gfm";

import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import remarkBreaks from "remark-breaks";
// import { remarkShiftHeadings } from "./plugins";

export async function mdToHtml(content: string) {
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

import { type ComponentProps } from "@kenstack/pageEditor/types";

// type Props = React.ComponentProps<"div"> & {
//   content?: string;
//   placeholder?: string;
// } & React.ComponentProps<"div">;

export default function Markdown({
  content,
  className,
  placeholder,
  ...props
}: ComponentProps<"div">) {
  delete props.tag; // in case this was used int he page editor.

  const [html, setHtml] = useState("");
  useEffect(() => {
    mdToHtml(content ?? "")
      .then((value) => {
        setHtml(value);
      })
      .catch((err) => {
        //eslint-disable-next-line no-console
        console.error(err);
      });
  }, [content]);

  if (html) {
    return (
      <div
        {...props}
        className={className}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  if (placeholder) {
    return (
      <div {...props} className={twMerge(className, "text-gray-500/50")}>
        {placeholder}
      </div>
    );
  }
}
