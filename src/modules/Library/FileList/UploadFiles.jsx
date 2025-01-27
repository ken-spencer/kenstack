import Upload from "./Upload";
import { useLibrary } from "../context";

export default function UploadFiles() {
  const { uploadQueue } = useLibrary();

  if (uploadQueue.length === 0) {
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
