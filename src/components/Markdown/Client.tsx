"use client";
import mdToHtml from "./mdToHtml";

import { twMerge } from "tailwind-merge";
import { useEffect, useState } from "react";

import { type ComponentProps } from "@kenstack/pageEditor/types";

export default function MarkdownClient({
  content,
  className,
  placeholder,
  ...props
}: ComponentProps<"div">) {
  delete props.tag; // in case this was used int he page editor.

  const [html, setHtml] = useState("");
  useEffect(() => {
    mdToHtml(content ?? "")
      .then((value) => {
        setHtml(value);
      })
      .catch((err) => {
        //eslint-disable-next-line no-console
        console.error(err);
      });
  }, [content]);

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
