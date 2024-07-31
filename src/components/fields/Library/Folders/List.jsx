import React, { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import listAction from "./api/listAction";
import useLibrary from "../useLibrary";

import Hr from "../../../admin/Hr";
import Home from "./Home";
import Folders from "./Folders";
import Confirm from "../Confirm";

import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import IconButton from "@admin/forms/IconButton";

// import styles from "./folders.module.scss";

const fetchFolders = async () => {
  const res = await listAction();
  if (res.success) {
    return res.folders;
  } else {
    throw new Error(res.error || "There was a problem");
  }
};

export default function FolderList(props) {
  const { folders, setFolders } = useLibrary();
  const [confirm, setConfirm] = useState(false);

  const { data: folderData } = useQuery({
    queryKey: ["folders"],
    queryFn: fetchFolders,
    initialData: [],
  });

  useEffect(() => {
    setFolders(folderData);
  }, [folderData, setFolders]);

  const closeConfirm = useCallback(() => {
    setConfirm(false);
  }, []);

  /**
   * Add folder at top
   **/
  const addFolder = useCallback(() => {
    var folder = {
      id: null,
      title: "",
      edit: true,
      key: Date.now(),
    };

    const copy = [folder, ...folders];
    setFolders(copy);
  }, [folders, setFolders]);

  /*
  useEffect(() => {
    listAction()
    .then((res) => {
      if (res.success) {
        setFolders(res.folders);
      }
    }, e => {
      console.error("Error loading folders", e.message);
    });
  }, [setFolders]);
  */

  return (
    <div className="flex flex-col fleg-grow  overflow-y-auto">
      <div className="admin-toolbar flex-none">
        Folders
        <IconButton
          onClick={() => addFolder(null)}
          title="New folder"
          aria-label="New folder"
        >
          <CreateNewFolderIcon />
        </IconButton>
      </div>

      <section className="flex-grow overflow-y-auto">
        <Home />
        <Hr />

        <Confirm
          confirm={confirm}
          onClose={closeConfirm}
          message="Are you certain you want to delete this folder and all of its contents?"
        />
        <ul>
          <Folders folderData={folderData} setConfirm={setConfirm} />
        </ul>
      </section>
    </div>
  );
}
