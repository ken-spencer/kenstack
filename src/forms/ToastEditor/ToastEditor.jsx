import { useRef, useEffect } from "react";
import useField from "../useField";
import Field from "../Field";

import { Editor } from "@toast-ui/react-editor";
import { useTheme } from 'next-themes'


const toolbarItems = [
  ['heading', 'bold', 'italic', /*'strike'*/],
  // ['hr', 'quote'],
  ['ul', 'ol', /*'task', 'indent', 'outdent'*/],
  [/*'table'*/, /*'image',*/ 'link'],
  // ['code', 'codeblock'],
  // ['scrollSync'],
]

export default function ToastEditor(initialProps) {
  const { field, props, fieldProps } = useField(initialProps);
  const ref = useRef(); // not compatible with form ref;
  const { theme } = useTheme();

  useEffect(() => {
    // if we initialize with initialValue we end up with 
    //unwanted default text. Hack to fix. 
    const instance = ref.current.getInstance();

    // seem to need a hack to prevent the editor from scrolling and focusing. 
    const { scrollX, scrollY } = window;
    instance.setMarkdown(field.value);
    setTimeout(() => {
      instance.blur();
      window.scrollTo(scrollX, scrollY);      
    }, 0);
  }, [])


  return (
    <Field field={field} {...fieldProps}>
      <Editor
        autofocus={false}
        ref={ref}
        usageStatistics={false}
        // initialValue={field.value}
        initialValue={""}
        previewStyle="tab"
        height="600px"
        initialEditType="markdown"
        useCommandShortcut={true}
        theme={theme}
        toolbarItems={toolbarItems}
        onChange={() => {
          const instance = ref.current.getInstance();
          field.setValue(instance.getMarkdown())
        }}
        hideModeSwitch={true}
      />
      <input type="hidden" name={props.name} value={field.value} />
    </Field>
  );
}
