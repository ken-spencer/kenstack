import HomeIcon from "@kenstack/icons/Home";
import DriveFileMoveIcon from "@kenstack/icons/DriveFileMove";

import { useLibrary } from "../context";
import useChangeFolder from "./useChangeFolder";

export default function HOme() {
  const { activeFolder, setActiveFolder, trash } = useLibrary();
  const { dndEvents, isDragOver } = useChangeFolder(null);

  const active = trash === false && activeFolder === null;
  return (
    <button
      type="button"
      className={
        "library-folder library-folder-border library-folder-bg" +
        (active ? " active" : "")
      }
      component="button"
      onClick={() => setActiveFolder(null)}
      {...dndEvents}
    >
      {isDragOver ? <DriveFileMoveIcon /> : <HomeIcon />}
      Home
    </button>
  );
}
