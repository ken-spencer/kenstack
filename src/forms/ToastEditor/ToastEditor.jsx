import { useRef, useEffect } from "react";
import useField from "../useField";
import Field from "../Field";

// import Editor from "./Editor";
import { useTheme } from "next-themes";
import Editor from "@toast-ui/editor";

const toolbarItems = [
  ["heading", "bold", "italic" /*'strike'*/],
  // ['hr', 'quote'],
  ["ul", "ol" /*'task', 'indent', 'outdent'*/],
  [, /*'table'*/ /*'image',*/ "link"],
  // ['code', 'codeblock'],
  // ['scrollSync'],
];

export default function ToastEditor(initialProps) {
  const { field, props, fieldProps } = useField(initialProps);
  const ref = useRef(); // not compatible with form ref;
  const { theme } = useTheme();

  useEffect(() => {
    const editor = new Editor({
      el: ref.current,
      theme: theme,
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
        change: () => {
          field.setValue(editor.getMarkdown());
        },
      },
    });

    // if we initialize with initialValue we end up with
    //unwanted default text. Hack to fix.
    // slso eem to need a hack to prevent the editor from scrolling and focusing.
    const { scrollX, scrollY } = window;
    editor.setMarkdown(field.value);
    setTimeout(() => {
      editor.blur();
      window.scrollTo(scrollX, scrollY);
    }, 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Field field={field} {...fieldProps}>
      <div ref={ref} />
      <input type="hidden" name={props.name} value={field.value} />
    </Field>
  );
}
