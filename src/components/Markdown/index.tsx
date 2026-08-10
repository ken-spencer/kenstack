import mdToHtml, { type MarkdownOptions } from "./mdToHtml";

import { twMerge } from "tailwind-merge";

import type { PageEditorContentProps } from "@kenstack/admin/pageEditor/wrapper";
import {
  loadMarkdownMentionTargets,
  remarkKenStackMarkdown,
  type MarkdownMentionLoader,
  type MarkdownMentionTargets,
} from "./plugins";

export type MarkdownProps = PageEditorContentProps<"div"> &
  MarkdownOptions & {
    mentionTargets?: MarkdownMentionTargets;
    mentionLoader?: MarkdownMentionLoader;
  };

export async function Markdown({
  content,
  className,
  mentionTargets,
  mentionLoader,
  placeholder,
  remarkPlugins,
  ...props
}: MarkdownProps) {
  delete props.tag; // In case this was used in the page editor.

  const markdown = content ?? "";
  const markdownClassName = twMerge("markdown", className);
  const loadedMentionTargets =
    mentionTargets ??
    (mentionLoader
      ? await loadMarkdownMentionTargets(markdown, mentionLoader)
      : undefined);
  const html = await mdToHtml(markdown, {
    remarkPlugins: [
      [remarkKenStackMarkdown, { mentionTargets: loadedMentionTargets }],
      ...(remarkPlugins ?? []),
    ],
  });

  if (html) {
    return (
      <div
        {...props}
        className={markdownClassName}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  if (placeholder) {
    return (
      <div
        {...props}
        className={twMerge(markdownClassName, "text-muted-foreground/50")}
      >
        {placeholder}
      </div>
    );
  }
}

export default Markdown;
