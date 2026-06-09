import mdToHtml, { type MarkdownOptions } from "./mdToHtml";

import { twMerge } from "tailwind-merge";

import { type ComponentProps } from "@kenstack/admin/pageEditor/types";

export type MarkdownProps = ComponentProps<"div"> & MarkdownOptions;

export async function Markdown({
  content,
  className,
  placeholder,
  remarkPlugins,
  ...props
}: MarkdownProps) {
  delete props.tag; // In case this was used in the page editor.

  const html = await mdToHtml(content ?? "", { remarkPlugins });

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

export default Markdown;
