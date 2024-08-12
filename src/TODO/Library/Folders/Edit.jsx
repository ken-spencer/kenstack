import React, { useRef, useEffect, useCallback } from "react";
// import { useMutation } from '@tanstack/react-query';

import { useMutation } from "../../../../query";

import Input from "@admin/forms/base/Input";

import saveAction from "./api/saveAction";
import useLibrary from "../useLibrary";

export default function FolderEdit({ folder }) {
  const ref = useRef();
  const { folders, setFolders, setError } = useLibrary();

  const mutation = useMutation(["folders"], saveAction, {
    onMutate: async (post, { set, previous }) => {
      // return early if new folder is empty
      if (folder.id === null && post.title.length === 0) {
        // Find and remove empty folders from the list
        let foldersCopy = folders.filter((f) => {
          return f.id === null ? false : true;
        });
        setFolders(foldersCopy);
        return;
      }

      // optimistic update when editing a folder
      set((old) =>
        old.map((f) => {
          if (f.id === folder.id) {
            return {
              ...folder,
              title: post.title,
              edit: false,
            };
          }
          return f;
        }),
      );

      return { previous };
    },
    onError: ({ error, context, revert }) => {
      revert();
      setError(error.message);
    },
    onSuccess: ({ data, refetch }) => {
      if (data.error) {
        setError(data.error);
      } else {
        refetch();
      }
    },
  });

  /*
  const handleSave = useCallback(
    (evt) => {
      var input = evt.currentTarget;

      // if (input.value.length && input.value === input.defaultValue) {
      //     return;
      // }

      if (folder.id === null && input.value.length === 0) {
        // Find and remove empty folders from the list
        let foldersCopy = folders.filter(f => {
          return f.id === null ? false : true;
        });
  
        setFolders(foldersCopy);
        return;
      }
  
  
      const foldersCopy = folders.map(f => {
        if (f.id === folder.id) {
          return {
            ...folder,
            title: input.value,
            edit: false,
          };
        }
        return f;
      });
      setFolders(foldersCopy);
  
      var post = {
        title: input.value,
        id: folder.id || null,
      };
  
      saveAction(post)
      .then(res => {
        if (res.error) {
          setError(res.error);
        } else if (res.success) {
          // setFolders(res.folders);
          setActiveFolder(res.id);
        }
      });
          
    },
    [folder, folders, setFolders, setActiveFolder, setError],
  );
  */

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
