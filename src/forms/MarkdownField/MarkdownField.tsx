"use client";

import { Editor, defaultValueCtx, rootCtx } from "@milkdown/kit/core";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { history } from "@milkdown/kit/plugin/history";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import "@milkdown/kit/prose/view/style/prosemirror.css";
import { replaceAll } from "@milkdown/kit/utils";
import {
  Milkdown,
  MilkdownProvider,
  useEditor,
  useInstance,
} from "@milkdown/react";
import { QueryClientContext } from "@tanstack/react-query";
import {
  placeholder as placeholderPlugin,
  placeholderCtx,
} from "milkdown-plugin-placeholder";
import { useContext, useEffect, useRef } from "react";
import { type ControllerRenderProps } from "react-hook-form";
import { twMerge } from "tailwind-merge";

import Field, { type FieldProps } from "@kenstack/forms/Field";
import { MarkdownEditorToolbar } from "@kenstack/forms/MarkdownEditor/Toolbar";
import {
  markdownMentionPlugin,
  type MarkdownMentionConfig,
} from "./mentions";

export type InputProps = React.ComponentProps<"input"> &
  FieldProps & {
    editorClassName?: string;
    editorContentClassName?: string;
    inputClass?: string;
    mentions?: MarkdownMentionConfig;
  };

export default function MarkdownField({
  name,
  label,
  description,
  className,
  editorClassName,
  editorContentClassName,
  mentions,
}: InputProps) {
  return (
    <Field
      name={name}
      label={label}
      description={description}
      className={className}
      render={({ field }) => (
        <MilkdownProvider>
          <MarkdownFieldEditor
            editorClassName={editorClassName}
            editorContentClassName={editorContentClassName}
            field={field}
            mentions={mentions}
          />
        </MilkdownProvider>
      )}
    />
  );
}

function MarkdownFieldEditor({
  editorClassName,
  editorContentClassName,
  field,
  mentions,
}: {
  editorClassName?: string;
  editorContentClassName?: string;
  field: ControllerRenderProps;
  mentions?: MarkdownMentionConfig;
}) {
  const initialValue = typeof field.value === "string" ? field.value : "";
  const lastEditorValue = useRef(initialValue);
  const [loading, get] = useInstance();
  const queryClient = useContext(QueryClientContext);

  useEditor((root) => {
    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, initialValue);
        ctx.set(placeholderCtx, "Start typing...");

        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          lastEditorValue.current = markdown;
          field.onChange(markdown);
        });

        ctx.get(listenerCtx).blur(() => {
          field.onBlur();
        });
      })
      .use(listener)
      .use(history)
      .use(placeholderPlugin)
      .use(commonmark)
      .use(gfm);

    return mentions
      ? editor.use(markdownMentionPlugin({ ...mentions, queryClient }))
      : editor;
  });

  useEffect(() => {
    const nextValue = typeof field.value === "string" ? field.value : "";
    if (loading || nextValue === lastEditorValue.current) {
      return;
    }

    lastEditorValue.current = nextValue;
    get().action(replaceAll(nextValue, true));
  }, [field.value, get, loading]);

  return (
    <div
      className={twMerge(
        "border-input bg-background overflow-hidden rounded-md border",
        editorClassName,
      )}
    >
      <MarkdownEditorToolbar variant="static" />
      <div
        className={twMerge(
          "min-h-[350px] px-3 py-2 [&_.ProseMirror]:min-h-[350px] [&_.ProseMirror]:outline-none",
          editorContentClassName,
        )}
      >
        <Milkdown />
      </div>
      <input
        type="hidden"
        name={field.name}
        value={typeof field.value === "string" ? field.value : ""}
        readOnly
      />
    </div>
  );
}
