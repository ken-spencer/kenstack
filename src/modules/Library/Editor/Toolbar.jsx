import { useLibrary } from "../context";

import AdminIcon from "@kenstack/components/AdminIcon";
import ArrowBackIosIcon from "@kenstack/icons/ArrowBack";

import Delete from "./Toolbar/Delete";
import Square from "./Toolbar/Square";

export default function Toolbar({ isLoading, file }) {
  const { setEdit } = useLibrary();

  return (
    <div className="admin-toolbar flex-none">
      <div className="admin-toolbar-left">
        <AdminIcon onClick={() => setEdit(null)} tooltip="Done">
          <ArrowBackIosIcon />
        </AdminIcon>
        <Square isLoading={isLoading} file={file} />
      </div>
      <div className="admin-toolbar-right">
        <Delete />
      </div>
    </div>
  );
}
