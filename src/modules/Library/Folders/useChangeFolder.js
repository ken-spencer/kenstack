import { useMemo, useState } from "react";
import useMutation from "@kenstack/hooks/useMutation";
import useLibrary from "../useLibrary";

import globals from "../globals";

import apiAction from "@kenstack/client/apiAction";

export default function useDrop(folder, paste = false) {
  const {
    apiPath,
    addMessage,
    activeFolder,
    dragData,
    clipboard,
    setClipboard,
    trash,
  } = useLibrary();
  const [isDragOver, setIsDragOver] = useState(false);

  const saveChangeFolderMutation = useMutation({
    queryKey: ["files", activeFolder, trash],
    // changeFolderAction,
    mutationFn: (post) => apiAction(apiPath + "/change-folder", post),
    onMutate: async ({ idArray }, { set, previous }) => {
      set((data) => ({
        files: data.files.filter((f) => !idArray.includes(f.id)),
      }));

      if (paste) {
        setClipboard([]);
      }
      return { previous, clipboard };
    },
    onError: ({ error, context }) => {
      if (paste) {
        setClipboard(context.clipboard);
      }

      addMessage({ error: error.message });
    },
    onSuccess: ({ variables, queryClient }) => {
      // ensure the query is invalidated for the drop folder
      queryClient.invalidateQueries({
        queryKey: ["files", variables.folder, trash],
      });
    },
  });

  const dndEvents = useMemo(
    () => ({
      onDragEnter: (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        // const dt = evt.dataTransfer;
        if (dragData.type !== "files") {
          return;
        }
        // setIsDragging(true);
        setIsDragOver(true);
      },
      onDragOver: (evt) => {
        evt.preventDefault();
      },

      onDragLeave: (evt) => {
        evt.preventDefault();
        evt.stopPropagation();

        if (dragData.type !== "files") {
          return;
        }

        const rect = evt.target.getBoundingClientRect();

        if (
          evt.clientX <= rect.left ||
          evt.clientX >= rect.right ||
          evt.clientY <= rect.top ||
          evt.clientY >= rect.bottom
        ) {
          setIsDragOver(false);
        }
      },

      onDrop: (evt) => {
        if (dragData.type !== "files") {
          return;
        }

        setIsDragOver(false);
        // setIsDragging(false);
        globals.dropFolder = folder;

        if (folder !== activeFolder) {
          saveChangeFolderMutation.mutate({ idArray: [dragData.id], folder });
        }
      },
    }),
    [folder, dragData, saveChangeFolderMutation, activeFolder],
  );

  return {
    saveChangeFolderMutation,
    dndEvents,
    isDragOver,
  };
}
