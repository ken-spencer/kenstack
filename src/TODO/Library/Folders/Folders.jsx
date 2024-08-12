import { useEffect, useState } from "react";

import FolderEdit from "./Edit";
// import sidebar from "../../../admin/Sidebar/sidebar.module.scss";
import ListItem from "../../../admin/Sidebar/ListItem";

import Folder from "./Folder";
import FolderIcon from "@mui/icons-material/Folder";

import useLibrary from "../useLibrary";

import saveOrderAction from "./api/saveOrderAction";
import { useMutation } from "../../../../query";

export default function Folders({
  folderData,
  setConfirm,
  // depth = 1,
  // mode,
  // chooseFolder,
  // ...props
}) {
  const [dragging, setDragging] = useState(null);
  const { folders, setFolders, setError } = useLibrary();

  const reorderMutation = useMutation(["folders"], saveOrderAction, {
    onMutate: async (post, { set, previous }) => {
      set(folders.map((f, key) => ({ ...f, priority: key + 1 })));
      return { previous };
    },
    onError: ({ error, context, revert }) => {
      revert();
      setError(error.message);
    },
    onSuccess: ({ data, refetch }) => {
      if (data.error) {
        setError(data.error);
      }
      refetch();
    },
  });

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const mouseUp = (evt) => {
      setDragging(null);
      const change = folders.some((f, key) => {
        // check if key order matches priority order;
        return f.id !== folderData[key]?.id;
      });

      if (change) {
        // convert to minimalist format for saving.
        const data = folders.map((f, key) => [f.id, key + 1]);
        reorderMutation.mutate(data);
      }
    };

    window.addEventListener("mouseup", mouseUp);
    return () => {
      window.removeEventListener("mouseup", mouseUp);
    };
  }, [dragging, folders, setFolders, folderData, reorderMutation]);

  if (folders.length === 0) {
    return null;
  }

  return folders.map((folder) => {
    if (folder.edit) {
      return (
        <ListItem
          className="cursor-pointer py-1"
          icon={FolderIcon}
          component="div"
          key={folder.id}
          active={true}
        >
          <FolderEdit folder={folder} />
        </ListItem>
      );
    }

    return (
      <Folder
        folder={folder}
        setConfirm={setConfirm}
        key={folder.dragging ? "dragging" : folder.id || folder.key}
        dragging={dragging}
        setDragging={setDragging}
      />
    );
  });
}
