import HomeIcon from "@mui/icons-material/Home";
import HomeArrowIcon from "./HomeArrowIcon";
import ListItem from "../../../admin/Sidebar/ListItem";
import useLibrary from "../useLibrary";
import useChangeFolder from "./useChangeFolder";

export default function HOme() {
  const { activeFolder, setActiveFolder, trash } = useLibrary();
  const { dndEvents, isDragOver } = useChangeFolder(null);

  return (
    <ul>
      <ListItem
        className="py-1"
        component="button"
        icon={isDragOver ? HomeArrowIcon : HomeIcon}
        active={trash === false && activeFolder === null}
        action={() => setActiveFolder(null)}
        {...dndEvents}
      >
        Home
      </ListItem>
    </ul>
  );
}
