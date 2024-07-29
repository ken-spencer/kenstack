import Upload from "./Upload";
import useLibrary from "../useLibrary";

export default function UploadFiles() {
  const { uploadQueue } = useLibrary();

  if (uploadQueue.map.length === 0) {
    return null;
  }

  return (
    <div className="admin-library-files">
      {uploadQueue.map((file) => {
        return <Upload key={file.key} file={file} />;
      })}
    </div>
  );
}
