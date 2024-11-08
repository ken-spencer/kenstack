import Editor from "./Editor";

import { LibraryEditProvider } from "./context";

export default function EditorCont({ id }) {
  return (
    <LibraryEditProvider id={id}>
      <Editor />
    </LibraryEditProvider>
  );
}
