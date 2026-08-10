"use client";
import type { MarkdownOptions } from "./mdToHtml";

import { twMerge } from "tailwind-merge";
import { useEffect, useState } from "react";

import type { PageEditorContentProps } from "@kenstack/admin/pageEditor/wrapper";
import { remarkKenStackMarkdown, type MarkdownMentionTargets } from "./plugins";

export type MarkdownClientProps = PageEditorContentProps<"div"> &
  MarkdownOptions & {
    mentionTargets?: MarkdownMentionTargets;
  };

export default function MarkdownClient({
  content,
  className,
  mentionTargets,
  placeholder,
  remarkPlugins,
  ...props
}: MarkdownClientProps) {
  delete props.tag; // In case this was used in the page editor.

  const markdownClassName = twMerge("markdown", className);
  const [html, setHtml] = useState("");
  useEffect(() => {
    let active = true;

    import("./mdToHtml")
      .then(({ default: mdToHtml }) =>
        mdToHtml(content ?? "", {
          remarkPlugins: [
            [remarkKenStackMarkdown, { mentionTargets }],
            ...(remarkPlugins ?? []),
          ],
        }),
      )
      .then((value) => {
        if (active) {
          setHtml(value);
        }
      })
      .catch((err) => {
        //eslint-disable-next-line no-console
        console.error(err);
      });

    return () => {
      active = false;
    };
  }, [content, mentionTargets, remarkPlugins]);

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
