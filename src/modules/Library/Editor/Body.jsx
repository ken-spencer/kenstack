import FormFields from "./Form";
import SquareTool from "./SquareTool";

import { useLibraryEditor } from "./context";

export default function Body() {
  const { file, mode } = useLibraryEditor();

  return (
    <div className="admin-library-editor">
      {mode === "square" ? (
        <SquareTool file={file} />
      ) : (
        <div className="admin-library-image">
          <img alt="" src={file.url} />
        </div>
      )}
      <div className="admin-library-details">
        <FormFields file={file} values={{ alt: file.alt }} />
      </div>
    </div>
  );
}
