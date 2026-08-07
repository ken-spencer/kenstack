"use client";
import React from "react";

import createEditor from "../wrapper";

import type {
  BlockTag,
  PageEditorContentProps,
} from "@kenstack/admin/pageEditor/wrapper";
function Text<T extends BlockTag = "div">({
  tag,
  content,
  ...props
}: PageEditorContentProps<T>) {
  return React.createElement(tag ?? "div", props, content);
}

export const TextEdit = createEditor({
  component: Text,
  editor: () => import("./TextAdmin"),
});
