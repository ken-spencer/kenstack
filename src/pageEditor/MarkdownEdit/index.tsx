"use client";

import createEditor from "../wrapper";

export const MarkdownEdit = createEditor({
  componentLoader: () => import("@kenstack/components/Markdown"),
  editor: () => import("./MarkdownAdmin"),
});
