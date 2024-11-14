import FormFields from "./Form";
import FormProvider from "@kenstack/forms/Provider";
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
          <img alt="" src={file.path} />
        </div>
      )}
      <div className="admin-library-details">
        <FormProvider values={{ alt: file.alt }}>
          <FormFields file={file} />
        </FormProvider>
      </div>
    </div>
  );
}
