import mdToHtml from "./mdToHtml";

import { twMerge } from "tailwind-merge";

import { type ComponentProps } from "@kenstack/admin/pageEditor/types";

export async function Markdown({
  content,
  className,
  placeholder,
  ...props
}: ComponentProps<"div">) {
  delete props.tag; // in case this was used int he page editor.

  const html = await mdToHtml(content ?? "");

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
