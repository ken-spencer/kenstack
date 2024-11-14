import { useRef } from "react";

// import saveOrderAction from "./api/saveOrderAction";

//import FolderEdit from "./Edit";
// import sidebar from "../../../admin/Sidebar/sidebar.module.scss";

import FolderIcon from "@kenstack/icons/Folder";
import DriveFileMoveIcon from "@kenstack/icons/DriveFileMove";
import DeleteIcon from "@kenstack/icons/Delete";

import useLibrary from "../useLibrary";
import apiAction from "@kenstack/client/apiAction";
import useMutation from "@kenstack/hooks/useMutation";

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

export default function Folder({
  folder,
  folders,
  setFolders,
  setConfirm,
  dragging,
  setDragging,
}) {
  const { trash, activeFolder, setActiveFolder, setError, apiPath } =
    useLibrary();
  const { dndEvents, isDragOver } = useChangeFolder(folder.id);

  const deleteMutation = useMutation({
    queryKey: ["folders"],
    mutationFn: (id) => apiAction(apiPath + "/delete-folder", id),
    onMutate: async (post, { set, previous }) => {
      set({
        folders: previous.folders.filter((f) => f.id !== folder.id),
      });
      // return { previous };
    },
    onError: ({ error, context }) => {
      // revert();
      setError(error.message);
    },
    onSuccess: ({ data, variables: folderId }) => {
      // Current folder has been deleted
      if (data.success) {
        if (folderId === activeFolder) {
          setActiveFolder(null);
        }
      } else {
        setError(data.error);
      }
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

  return (
    <div
      className={
        "flex items-center library-folder-border library-folder-bg" +
        (trash === false && activeFolder === folder.id ? " active" : "")
      }
    >
      <button
        type="button"
        className={
          "library-folder " +
          (dragging?.active ? "cursor-ns-resize" : "cursor-pointer")
        }
        data-id={folder.id}
        onClick={() => {
          // clear();
        }}
        onDoubleClick={() => {
          clear();
          enableEdit();
        }}
        onMouseDown={(evt) => {
          if (trash) {
            return;
          }

          setDragging({
            folder,
            active: false,
            original: folders,
          });

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
            setDragging({ ...dragging, active: true });
            clear();
          }
        }}
        onMouseEnter={() => {
          if (!dragging) {
            return;
          }

          if (!dragging.active) {
            setDragging({ ...dragging, active: true });
          }

          const moveFolder = folders.find((f) => f.id === folder.id);

          const copy = folders.map((f) => {
            if (f.id === folder.id) {
              return dragging.folder;
            }

            if (f.id === dragging.folder.id) {
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
        {isDragOver ? <DriveFileMoveIcon /> : <FolderIcon />}
        {folder.title}
      </button>
      {folder.id && trash === false && activeFolder === folder.id && (
        <button
          type="button"
          title="Delete folder"
          aria-label="Delete folder"
          onClick={() =>
            setConfirm(() => () => deleteMutation.mutate(folder.id))
          }
        >
          <DeleteIcon />
        </button>
      )}
    </div>
  );
}
