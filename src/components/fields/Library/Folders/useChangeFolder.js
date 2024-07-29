import { useMemo, useState } from "react";
import { useMutation } from "@thaumazo/cms/query";
import useLibrary from "../useLibrary";

import globals from "../globals";

import changeFolderAction from "./api/changeFolderAction";

export default function useDrop(folder, paste = false) {
  const { activeFolder, dragData, clipboard, setClipboard, trash, setError } =
    useLibrary();
  const [isDragOver, setIsDragOver] = useState(false);

  const saveChangeFolderMutation = useMutation(
    ["files", activeFolder, trash],
    changeFolderAction,
    {
      onMutate: async ({ idArray }, { set, previous }) => {
        set((files) => files.filter((f) => !idArray.includes(f.id)));

        if (paste) {
          setClipboard([]);
        }
        return { previous, clipboard };
      },
      onError: ({ error, context, revert }) => {
        revert();

        if (paste) {
          setClipboard(context.clipboard);
        }

        setError(error.message);
      },
      onSuccess: ({ data, refetch }) => {
        if (data.error) {
          setError(data.error);
        }
        refetch();
      },
    },
  );

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
