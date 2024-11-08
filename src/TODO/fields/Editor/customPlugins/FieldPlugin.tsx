import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

export default function FieldPlugin({ field }): JSX.Element {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const handleBlur = () => {
      const state = editor.getEditorState();
      const json = state.toJSON();
      // setValue(json);
      field.value = JSON.stringify(json);
    };
    const root = editor.getRootElement();
    root.addEventListener("blur", handleBlur, true);

    return () => {
      root.removeEventListener("blur", handleBlur, true);
    };
  }, [editor, field]);

  return null;
}
