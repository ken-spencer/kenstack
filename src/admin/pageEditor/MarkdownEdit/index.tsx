"use client";

import { twMerge } from "tailwind-merge";

import createEditor from "../wrapper";
import React from "react";

import type {
  BlockTag,
  PageEditorContentProps,
} from "@kenstack/admin/pageEditor/wrapper";
function Markdown<T extends BlockTag = "div">({
  tag,
  content,
  className,
  placeholder,
  ...props
}: PageEditorContentProps<T>) {
  return React.createElement(tag ?? "div", {
    ...props,
    className: twMerge(
      "markdown",
      className,
      !content && placeholder ? "opacity-50 select-none" : undefined,
    ),
    dangerouslySetInnerHTML: { __html: content || placeholder },
  });
}

export const MarkdownEdit = createEditor({
  component: Markdown,
  editor: () => import("./MarkdownAdmin"),
});
