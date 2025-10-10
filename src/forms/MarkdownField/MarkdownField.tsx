"use client";

import { useFormContext } from "react-hook-form";
import { useRef, useEffect } from "react";
import Editor from "@toast-ui/editor";
import Field, { type FieldProps } from "@kenstack/forms/Field";

const toolbarItems = [
  ["heading", "bold", "italic" /*'strike'*/],
  // ['hr', 'quote'],
  ["ul", "ol" /*'task', 'indent', 'outdent'*/],
  [, /*'table'*/ /*'image',*/ "link"],
  // ['code', 'codeblock'],
  // ['scrollSync'],
];

type InputProps = React.ComponentProps<"input"> &
  FieldProps & {
    inputClass?: string;
  };

export default function MarkdownField({
  name,
  label,
  description,
  className,
  inputClass,
  ...props
}: InputProps) {
  const ref = useRef(null);
  const { setValue, getValues } = useFormContext();

  useEffect(() => {
    const editor = new Editor({
      el: ref.current,
      // theme: theme,
      autofocus: false,
      usageStatistics: false,
      initialValue: "",
      previewStyle: "tab",
      height: "400px",
      initialEditType: "markdown",
      useCommandShortcut: true,
      toolbarItems: toolbarItems,
      hideModeSwitch: true,
      events: {
        blur: () => {
          // console.log("blur time");
        },
        change: () => {
          setValue(name, editor.getMarkdown(), {
            shouldDirty: true,
            shouldTouch: true,
          });
        },
      },
    });

    // if we initialize with initialValue we end up with
    //unwanted default text. Hack to fix.
    // slso eem to need a hack to prevent the editor from scrolling and focusing.
    const { scrollX, scrollY } = window;
    editor.setMarkdown(getValues(name));
    setTimeout(() => {
      editor.blur();
      editor.setScrollTop(0);
      window.scrollTo(scrollX, scrollY);
    }, 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Field
      name={name}
      label={label}
      description={description}
      className={className}
      render={({ field }) => (
        <div>
          <div ref={ref} />
          <input type="hidden" name={name} value={field.value} />
        </div>
      )}
    />
  );
}
