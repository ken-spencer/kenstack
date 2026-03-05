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
  Editor: DynamicComponent<PageEditorAdminProps>
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
    // const [value, setValue] = useState(defaultValue);

    if (!isEditingEnabled()) {
      return <Component tag={tag} {...componentProps} content={defaultValue} />;
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
              // commit={commit}
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
          content={defaultValue}
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
          "absolute -top-3 -right-6 size-6 rounded-full cursor-pointer " +
          (editing === name ? "bg-indigo-600 text-white" : "")
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
