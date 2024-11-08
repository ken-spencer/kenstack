import React, { useRef, useEffect, useCallback } from "react";

import useMutation from "@kenstack/hooks/useMutation";

import Input from "@kenstack/forms/base/Input";

import apiAction from "@kenstack/client/apiAction";
import useLibrary from "../useLibrary";

export default function FolderEdit({ folder }) {
  const ref = useRef();
  const { apiPath, setError } = useLibrary();

  const mutation = useMutation({
    queryKey: ["folders"],
    mutationFn: (post) => apiAction(apiPath + "/save-folder", post),
    onMutate: async (post, { set, previous }) => {
      // return early if new folder is empty
      if (folder.id === null && post.title.length === 0) {
        // Find and remove empty folders from the list
        let foldersCopy = previous.folders.filter((f) => {
          return f.id === null ? false : true;
        });
        set({ folders: foldersCopy });
        return;
      }

      // optimistic update when editing a folder

      const copy = previous.folders.map((f) => {
        if (f.id === folder.id) {
          return {
            ...folder,
            title: post.title,
            edit: false,
          };
        }
        return f;
      });

      set({ folders: copy });

      const previousCopy = previous.folders.map((f) =>
        f.id === folder.id ? { ...folder, title: post.title } : f,
      );

      return { previous: { folders: previousCopy } };
    },
    onError: ({ error, context, revert }) => {
      revert();
      setError(error.message);
    },
    onSuccess: ({ data }) => {
      if (data.error) {
        setError(data.error);
      }
    },
  });

  const handleKeyDown = useCallback((evt) => {
    const input = evt.target;
    if (evt.key === "Escape") {
      input.value = input.defaultValue;
    } else if (evt.key !== "Enter") {
      return;
    }
    input.blur();
  }, []);

  useEffect(() => {
    ref.current.focus();
    ref.current.select();
  }, []);

  return (
    <Input
      ref={ref}
      type="text"
      defaultValue={folder.title}
      onBlur={(evt) => {
        mutation.mutate({
          title: evt.currentTarget.value.trim(),
          id: folder.id || null,
        });
      }}
      onKeyDown={handleKeyDown}
      placeholder="Folder name"
    />
  );
}
