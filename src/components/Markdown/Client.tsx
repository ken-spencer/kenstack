"use client";
import mdToHtml, { type MarkdownOptions } from "./mdToHtml";

import { twMerge } from "tailwind-merge";
import { useEffect, useState } from "react";

import { type ComponentProps } from "@kenstack/admin/pageEditor/types";
import { remarkKenStackMarkdown, type MarkdownMentionTargets } from "./plugins";

export type MarkdownClientProps = ComponentProps<"div"> &
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

  const [html, setHtml] = useState("");
  useEffect(() => {
    let active = true;

    mdToHtml(content ?? "", {
      remarkPlugins: [
        [remarkKenStackMarkdown, { mentionTargets }],
        ...(remarkPlugins ?? []),
      ],
    })
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
        className={className}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  if (placeholder) {
    return (
      <div
        {...props}
        className={twMerge(className, "text-muted-foreground/50")}
      >
        {placeholder}
      </div>
    );
  }
}
