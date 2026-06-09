"use client";
import mdToHtml, { type MarkdownOptions } from "./mdToHtml";

import { twMerge } from "tailwind-merge";
import { useEffect, useState } from "react";

import { type ComponentProps } from "@kenstack/admin/pageEditor/types";

export type MarkdownClientProps = ComponentProps<"div"> & MarkdownOptions;

export default function MarkdownClient({
  content,
  className,
  placeholder,
  remarkPlugins,
  ...props
}: MarkdownClientProps) {
  delete props.tag; // In case this was used in the page editor.

  const [html, setHtml] = useState("");
  useEffect(() => {
    mdToHtml(content ?? "", { remarkPlugins })
      .then((value) => {
        setHtml(value);
      })
      .catch((err) => {
        //eslint-disable-next-line no-console
        console.error(err);
      });
  }, [content, remarkPlugins]);

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
