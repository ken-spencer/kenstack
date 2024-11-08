import AdminIcon from "@kenstack/components/AdminIcon";
import AccountBoxIcon from "@kenstack/icons/AccountBox";

import { useLibraryEditor } from "../context";

export default function Square({ isLoading, file }) {
  const { mode, setMode } = useLibraryEditor();

  return (
    <AdminIcon
      className={mode === "square" ? "active" : ""}
      disabled={isLoading || !file || file.width === file.height}
      onClick={() => {
        setMode(mode === "square" ? null : "square");
      }}
      tooltip="Square"
    >
      <AccountBoxIcon />
    </AdminIcon>
  );
}
