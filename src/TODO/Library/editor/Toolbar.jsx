import useLibrary from "../useLibrary";

import Button from "@admin/forms/Button";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";

import Delete from "./Toolbar/Delete";
import Square from "./Toolbar/Square";

export default function Toolbar({ isLoading, file }) {
  const { setEdit } = useLibrary();

  return (
    <div className="admin-toolbar flex-none">
      <div className="admin-toolbar-left">
        <Square isLoading={isLoading} file={file} />
      </div>
      <div className="admin-toolbar-right">
        <Delete />
        <Button
          startIcon={<ArrowBackIosIcon />}
          type="button"
          onClick={() => setEdit(null)}
        >
          Done
        </Button>
      </div>
    </div>
  );
}
