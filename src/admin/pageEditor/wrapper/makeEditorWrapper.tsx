import React from "react";
import { usePageEditor } from "@kenstack/admin/pageEditor/context";
import { useAdminUi } from "@kenstack/admin/components/PageControls/useAdminUi";
import Tooltip from "@kenstack/components/Tooltip";
import { PageEditorForm } from "../Form";

import type {
  EditorWrapperProps,
  PageEditorAdminProps,
  Name,
} from "@kenstack/admin/pageEditor/types";

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
    const { showAdminControls } = useAdminUi();
    const displayValue = content.display[name];

    if (!showAdminControls) {
      return (
        <Component
          tag={tag}
          {...componentProps}
          placeholder={placeholder}
          content={displayValue}
        />
      );
    }

    if (editing === name) {
      return (
        <Toggle name={name}>
          <PageEditorForm>
            <Editor
              name={name}
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
          content={displayValue}
        />
      </Toggle>
    );
  };
}

function Toggle({ name, children }: { name: Name; children: React.ReactNode }) {
  const { editing, setEditing } = usePageEditor();

  return (
    <div className="relative">
      {children}
      <Tooltip
        className="absolute -top-3 right-0 z-10 sm:-right-6"
        content="Edit"
        side="left"
      >
        <button
          type="button"
          aria-label="Edit"
          className={
            "bg-card/85 ring-border size-6 cursor-pointer rounded-full shadow ring-1 sm:bg-transparent sm:shadow-none sm:ring-0 " +
            (editing === name
              ? "!bg-fuchsia-800/85 text-white ring-fuchsia-800/60"
              : "")
          }
          onClick={() => {
            setEditing(editing === name ? null : name);
          }}
        >
          ✎
        </button>
      </Tooltip>
    </div>
  );
}
