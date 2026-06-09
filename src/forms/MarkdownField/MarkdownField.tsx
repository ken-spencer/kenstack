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
import {
  placeholder as placeholderPlugin,
  placeholderCtx,
} from "milkdown-plugin-placeholder";
import { useEffect, useRef } from "react";
import { type ControllerRenderProps } from "react-hook-form";
import { twMerge } from "tailwind-merge";

import Field, { type FieldProps } from "@kenstack/forms/Field";
import { MarkdownEditorToolbar } from "@kenstack/forms/MarkdownEditor/Toolbar";

export type InputProps = React.ComponentProps<"input"> &
  FieldProps & {
    editorClassName?: string;
    editorContentClassName?: string;
    inputClass?: string;
  };

export default function MarkdownField({
  name,
  label,
  description,
  className,
  editorClassName,
  editorContentClassName,
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
}: {
  editorClassName?: string;
  editorContentClassName?: string;
  field: ControllerRenderProps;
}) {
  const initialValue = typeof field.value === "string" ? field.value : "";
  const lastEditorValue = useRef(initialValue);
  const [loading, get] = useInstance();

  useEditor((root) =>
    Editor.make()
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
      .use(gfm),
  );

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
