import { useRef } from "react";

// import saveOrderAction from "./api/saveOrderAction";

//import FolderEdit from "./Edit";
// import sidebar from "../../../admin/Sidebar/sidebar.module.scss";
import ListItem from "../../../admin/Sidebar/ListItem";

import FolderIcon from "@mui/icons-material/Folder";
import DriveFileMoveIcon from "@mui/icons-material/DriveFileMove";

import IconButton from "@thaumazo/forms/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";

import useLibrary from "../useLibrary";
import deleteAction from "./api/deleteAction";
import { useMutation } from "@admin/query";

// import globals from "../globals";
import useChangeFolder from "./useChangeFolder";

const defaultMouseData = {
  active: false,
  timeout: null,
  startX: null,
  startY: null,
  // x: null,
  // y: null,
};

export default function Folder({ folder, setConfirm, dragging, setDragging }) {
  const {
    trash,
    folders,
    setFolders,
    activeFolder,
    setActiveFolder,
    setError,
    // dragData,
  } = useLibrary();
  const { dndEvents, isDragOver } = useChangeFolder(folder.id);

  const deleteMutation = useMutation(["folders"], deleteAction, {
    onMutate: async (post, { set, previous }) => {
      set(folders.filter((f) => f.id !== folder.id));
      return { previous };
    },
    onError: ({ error, context, revert }) => {
      revert();
      setError(error.message);
    },
    onSuccess: ({ data, variables: folder, refetch }) => {
      // Current folder has been deleted
      if (data.success) {
        if (folder === activeFolder) {
          setActiveFolder(null);
        }
      } else {
        setError(data.error);
      }

      refetch();
    },
  });

  /*
  const handleDelete = useCallback(() => {
      setConfirm(() => deleteMutation.mutate(folder.id));

      });

  }, [setConfirm, folder.id]);
  */

  const mouseData = useRef(defaultMouseData);
  const clear = () => {
    const data = mouseData.current;
    if (data.active) {
      clearTimeout(data.timeout);
      mouseData.current = defaultMouseData;
    }
  };

  const enableEdit = () => {
    const copy = folders.map((f) => {
      return {
        ...f,
        edit: f.id === folder.id,
      };
    });
    setFolders(copy);
  };

  const dragActive = dragging ? dragging[1] : false;
  const active = trash === false && activeFolder === folder.id;
  return (
    <ListItem
      className={
        "cursor-pointer py-1 select-none library-folder" +
        (dragActive ? " cursor-ns-resize" : "")
      }
      data-id={folder.id}
      icon={isDragOver ? DriveFileMoveIcon : FolderIcon}
      endIcon={
        active && (
          <IconButton
            title="Delete folder"
            aria-label="Delete folder"
            onClick={() =>
              setConfirm(() => () => deleteMutation.mutate(folder.id))
            }
          >
            <DeleteIcon />
          </IconButton>
        )
      }
      component="div"
      active={active}
      onClick={() => {
        // clear();
      }}
      onDoubleClick={() => {
        clear();
        enableEdit();
      }}
      onMouseDown={(evt) => {
        // ensure no fetch happens while dragging
        // Disabling for now as need to ensure a f4etch after drag. Probably overthinking.

        setDragging([folder, false]);
        clear();

        mouseData.current = {
          ...defaultMouseData,
          active: Date.now(),
          startX: evt.pageX,
          startY: evt.pageY,
          timeout: setTimeout(() => {
            // Long press
            clear();
            enableEdit();
          }, 1000),
        };
      }}
      onMouseUp={() => {
        if (!mouseData.current.active) {
          return;
        }

        clear();
        setActiveFolder(folder.id);
      }}
      onMouseMove={(evt) => {
        const data = mouseData.current;
        if (
          data.active &&
          (Math.abs(data.startX - evt.pageX) >= 2 ||
            Math.abs(data.startY - evt.pageY) >= 2)
        ) {
          setDragging([folder, true]);
          clear();
        }
      }}
      onMouseEnter={() => {
        if (!dragging) {
          return;
        }
        const [dragFolder, active] = dragging;

        if (!active) {
          setDragging([dragFolder, true]);
        }

        // const dragFolder = folders.find(f => f.id === dragging);
        const moveFolder = folders.find((f) => f.id === folder.id);

        const copy = folders.map((f) => {
          if (f.id === folder.id) {
            return dragFolder;
          }

          if (f.id === dragFolder.id) {
            return moveFolder;
          }

          return f;
        });
        setFolders(copy);
      }}
      onMouseLeave={() => {
        if (!mouseData.current.active) {
          return;
        }
        clear();
      }}
      {...dndEvents}
    >
      {folder.title}
    </ListItem>
  );
}
