"use client";
import React from "react";

import createEditor from "../wrapper";
import type { BlockTag, ComponentProps } from "@kenstack/pageEditor/types";

// type Tag = keyof React.JSX.IntrinsicElements;

function Text<T extends BlockTag = "div">({
  tag,
  content,
  ...props
}: ComponentProps<T>) {
  return React.createElement(tag ?? ("div" as T), props, content);
}

export const TextEdit = createEditor({
  component: Text,
  editor: () => import("./TextAdmin"),
});
