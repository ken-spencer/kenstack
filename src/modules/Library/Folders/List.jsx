import React, { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import apiAction from "@kenstack/client/apiAction";
import { useLibrary } from "../context";

import Home from "./Home";
import Folders from "./Folders";
import Confirm from "../Confirm";
import ErrorIndicator from "@kenstack/components/ErrorIndicator";

import CreateNewFolderIcon from "@kenstack/icons/NewFolder";

export default function FolderList(props) {
  const { /*folders, setFolders, */ apiPath } = useLibrary();
  const [confirm, setConfirm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["folders"],
    queryFn: () => apiAction(apiPath + "/list-folders"),
    staleTime: 5 * 60 * 1000,
    // initialData: [],
  });

  const queryClient = useQueryClient();
  const setFolders = useCallback(
    (value) => {
      queryClient.setQueryData(["folders"], { folders: value });
    },
    [queryClient],
  );

  const closeConfirm = useCallback(() => {
    setConfirm(false);
  }, []);

  /**
   * Add folder at top
   **/
  const addFolder = useCallback(() => {
    // TODFO this should be a mutation.
    setFolders([
      {
        id: null,
        title: "",
        edit: true,
        key: Date.now(),
      },
      ...data.folders,
    ]);
  }, [data, setFolders]);

  return (
    <div className="flex flex-col fleg-grow gap-2 overflow-y-auto">
      <div className="flex items-center justify-between px-2 py-0.5 admin-border">
        Folders
        <button
          type="button"
          onClick={() => addFolder()}
          disabled={isLoading || data.error}
          title="New folder"
          aria-label="New folder"
        >
          <CreateNewFolderIcon className="w-6 h-6 ml-auto text-gray-800" />
        </button>
      </div>

      <section className="flex-grow overflow-y-auto">
        <Home />
        <hr className="border-gray-300 my-2" />

        <Confirm
          confirm={confirm}
          onClose={closeConfirm}
          message="Are you certain you want to delete this folder and all of its contents?"
        />
        <ul className="flex flex-col gap-2">
          {(() => {
            if (isLoading) {
              return null;
            }

            if (data.error) {
              return <ErrorIndicator />;
            }

            return (
              <Folders
                folders={data.folders}
                setFolders={setFolders}
                setConfirm={setConfirm}
              />
            );
          })()}
        </ul>
      </section>
    </div>
  );
}
