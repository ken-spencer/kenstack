import { useEffect, useState } from "react";

import FolderEdit from "./Edit";

import Folder from "./Folder";
import FolderIcon from "@kenstack/icons/Folder";

import useLibrary from "../useLibrary";

// import saveOrderAction from "./api/saveOrderAction";
import apiAction from "@kenstack/client/apiAction";
import useMutation from "@kenstack/hooks/useMutation";

export default function Folders({ folders, setFolders, setConfirm }) {
  const [dragging, setDragging] = useState(null);
  const { apiPath, psetError } = useLibrary();

  const reorderMutation = useMutation({
    queryKey: ["folders"],
    mutationFn: (post) => apiAction(apiPath + "/save-folder-order", post.data),
    onMutate: async (post) => {
      return { previous: post.original };
    },
    onError: ({ error, variables }) => {
      setError(error.message);
    },
    onSuccess: ({ data }) => {
      if (data.error) {
        setError(data.error);
      }
    },
  });

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const mouseUp = (evt) => {
      if (dragging?.active !== true) {
        return;
      }
      const original = dragging.original;
      setDragging(null);
      const change = folders.some((f, key) => {
        // check if key order matches priority order;
        return f.id !== original[key]?.id;
      });

      if (change) {
        // convert to minimalist format for saving.
        const data = folders.map((f, key) => [f.id, key + 1]);
        reorderMutation.mutate({
          data,
          original: { folders: original },
        });
      }
    };

    window.addEventListener("mouseup", mouseUp);
    return () => {
      window.removeEventListener("mouseup", mouseUp);
    };
  }, [dragging, folders, setFolders, reorderMutation]);

  if (folders.length === 0) {
    return null;
  }

  return folders.map((folder) => {
    if (folder.edit) {
      return <FolderEdit key="edit" folder={folder} />;
    }

    return (
      <Folder
        folder={folder}
        folders={folders}
        setFolders={setFolders}
        setConfirm={setConfirm}
        key={folder.dragging ? "dragging" : folder.id || folder.key}
        dragging={dragging}
        setDragging={setDragging}
      />
    );
  });
}
