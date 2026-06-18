import { useLayoutEffect, useEffect, useRef, useCallback } from "react";
import { useCommit } from "../context";
import { twMerge } from "tailwind-merge";

import { makeEditorWrapper } from "../wrapper/makeEditorWrapper";
import { type PageEditorAdminProps } from "../types";
import { type ControllerRenderProps } from "react-hook-form";

import Field from "@kenstack/forms/Field";

const TextAdmin = makeEditorWrapper(TextAdminEdit);
export default TextAdmin;

export function TextAdminEdit({
  name,
  className,
  placeholder,
}: PageEditorAdminProps) {
  return (
    <Field
      name={name}
      label={null}
      render={({ field }) => (
        <Textarea
          field={field}
          name={name}
          className={className}
          placeholder={placeholder}
        />
      )}
    />
  );
}

const Textarea = ({
  name,
  field,
  className,
  placeholder,
}: PageEditorAdminProps & {
  field: ControllerRenderProps;
}) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const commit = useCommit();

  const setRefs = useCallback(
    (el: HTMLTextAreaElement | null) => {
      ref.current = el;
      field.ref(el);
    },
    [field],
  );

  const resize = () => {
    const el = ref.current;
    if (!el) {
      return;
    }

    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, []);

  useLayoutEffect(() => {
    resize();
  }, [field.value]);

  return (
    <textarea
      rows={1}
      className={twMerge(
        "m-0 w-full resize-none border-0 bg-transparent p-0 shadow-none",
        className,
        "outline-gray-500/50 outline-dashed",
      )}
      placeholder={placeholder}
      {...field}
      onBlur={() => {
        field.onBlur();
        commit(name);
      }}
      ref={setRefs}
    />
  );
};
