import FormFields from "./Form";
import FormProvider from "@thaumazo/forms/Provider";
import SquareTool from "./SquareTool";
import useLibrary from "../useLibrary";

export default function Body({ file, id }) {
  const { edit } = useLibrary();
  return (
    <div className="admin-library-editor">
      {edit.tool === "square"  ? (
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
