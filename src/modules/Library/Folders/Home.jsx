import HomeIcon from "@mui/icons-material/Home";
import HomeArrowIcon from "./HomeArrowIcon";
import useLibrary from "../useLibrary";
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
      {isDragOver ? <HomeArrowIcon /> : <HomeIcon />}
      Home
    </button>
  );
}
