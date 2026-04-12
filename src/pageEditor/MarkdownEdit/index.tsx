"use client";

import { twMerge } from "tailwind-merge";

import createEditor from "../wrapper";
import React from "react";

// import component from "@kenstack/components/Markdown";

import type { BlockTag, ComponentProps } from "@kenstack/pageEditor/types";
function Markdown<T extends BlockTag = "div">({
  tag,
  content,
  className,
  placeholder,
  ...props
}: ComponentProps<T>) {
  return React.createElement(tag ?? ("div" as T), {
    ...props,
    className: twMerge(
      className,
      !content && placeholder ? "opacity-50 select-none" : undefined,
    ),
    dangerouslySetInnerHTML: { __html: content || placeholder },
  });
}

export const MarkdownEdit = createEditor({
  // componentLoader: () => import("@kenstack/components/Markdown"),
  component: Markdown,
  editor: () => import("./MarkdownAdmin"),
});
