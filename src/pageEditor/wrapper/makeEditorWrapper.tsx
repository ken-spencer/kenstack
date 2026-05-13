import React from "react";
import { usePageEditor } from "@kenstack/pageEditor/context";
import { useAdminUi } from "@kenstack/hooks/useAdminUi";
import Alert from "@kenstack/components/Alert";
import { CircleX } from "lucide-react";
import { Button } from "@kenstack/components/ui/button";
import { PageEditorForm } from "../Form";

import type {
  EditorWrapperProps,
  PageEditorAdminProps,
  Name,
} from "@kenstack/pageEditor/types";

type DynamicComponent<P> = React.ComponentType<P> & {
  preload?: () => void;
};

export function makeEditorWrapper(
  Editor: DynamicComponent<PageEditorAdminProps>,
) {
  return function EditorWrapper({
    tag,
    name,
    placeholder,
    Component,
    componentProps,
  }: EditorWrapperProps) {
    const { content, editing } = usePageEditor();
    const { isEditingEnabled } = useAdminUi();
    const defaultValue = content[name];
    const html = name === "content" ? content["contentHtml"] : undefined;

    if (!isEditingEnabled()) {
      return (
        <Component
          tag={tag}
          {...componentProps}
          placeholder={placeholder}
          content={html ?? defaultValue}
        />
      );
    }

    if (editing === name) {
      return (
        <Toggle name={name}>
          <PageEditorForm>
            <Editor
              name={name}
              // value={value}
              // setValue={setValue}
              placeholder={placeholder}
              className={componentProps.className}
            />
          </PageEditorForm>
        </Toggle>
      );
    }

    return (
      <Toggle name={name}>
        <Component
          tag={tag}
          {...componentProps}
          placeholder={placeholder}
          content={html ?? defaultValue}
        />
      </Toggle>
    );
  };
}

function Toggle({ name, children }: { name: Name; children: React.ReactNode }) {
  const { error, setError, editing, setEditing } = usePageEditor();

  return (
    <div className="relative">
      {error && error.name === name ? (
        <Alert>
          <div className="flex items-center">
            <div className="grow">{error.message}</div>
            <Button
              size="icon"
              className="flex-0"
              variant="ghost"
              onClick={() => setError(null)}
            >
              <CircleX />
            </Button>
          </div>
        </Alert>
      ) : null}
      {children}
      <button
        type="button"
        className={
          "absolute -top-3 right-0 z-10 size-6 cursor-pointer rounded-full bg-white/85 shadow ring-1 ring-black/10 sm:-right-6 sm:bg-transparent sm:shadow-none sm:ring-0 dark:bg-gray-950/85 sm:dark:bg-transparent " +
          (editing === name
            ? "!bg-fuchsia-800/85 text-white ring-fuchsia-800/60"
            : "")
        }
        onClick={() => {
          setEditing(editing === name ? null : name);
          setError(null);
        }}
      >
        ✎
      </button>
    </div>
  );
}
