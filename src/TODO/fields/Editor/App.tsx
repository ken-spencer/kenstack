"use client";

import styles from "./editor.module.scss";
// import Field from "@kenstack/forms/Field";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { isDevPlayground } from "./lib/appSettings";
import { SharedHistoryContext } from "./context/SharedHistoryContext";
// import PlaygroundNodes from "./nodes/PlaygroundNodes";
import PlaygroundNodes from "./nodes";
import DocsPlugin from "./plugins/DocsPlugin";
import PasteLogPlugin from "./plugins/PasteLogPlugin";
import { TableContext } from "./plugins/TablePlugin";
// import Settings from "./lib/Settings";
import PlaygroundEditorTheme from "./theme/PlaygroundEditorTheme";
import Editor from "./Editor";

/*
interface LexicalEditorProps {
  field: Field;
}
*/

export default function LexicalEditor({ field }): JSX.Element {
  const initialConfig = {
    // editorState: getPrepopulatedRichText,
    editorState: field.value || null,
    namespace: "Playground",
    nodes: [...PlaygroundNodes],
    onError: (error: Error) => {
      throw error;
    },
    onBlur: () => {
      // console.log("foo bar");
    },
    theme: PlaygroundEditorTheme,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <SharedHistoryContext>
        <TableContext>
          <>
            <div className={styles.editorShell}>
              <Editor field={field} />
            </div>
            {isDevPlayground ? <DocsPlugin /> : null}
            {isDevPlayground ? <PasteLogPlugin /> : null}
          </>
        </TableContext>
      </SharedHistoryContext>
    </LexicalComposer>
  );
}

/*
import { SharedAutocompleteContext } from "./context/SharedAutocompleteContext";
          <SharedAutocompleteContext>
          </SharedAutocompleteContext>
*/
