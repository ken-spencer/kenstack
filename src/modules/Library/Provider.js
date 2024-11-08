"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Context from "./Context";

// import defaultFile from "./FileList/defaultFile";
// import useFiles from "./FileList/useFiles";

const accept = ["image/jpeg", "image/gif", "image/png", "image/webp"];

export default function LibraryProvider({
  mode = "image", // image | file
  edit: editDefault = null,
  children,
  apiPath,
}) {
  // const [folders, setFolders] = useState([]);
  const [dragData, setDragData] = useState({});
  const [uploadQueue, setUploadQueue] = useState([]);
  const [keywords, setKeywords] = useState("");
  const [edit, setEdit] = useState(editDefault);
  const [selecting, setSelectingBase] = useState(false);
  const [error, setError] = useState("");

  const [messages, setMessages] = useState([]);
  const addMessage = useCallback(
    (message) => {
      if (
        typeof message.success !== "string" &&
        typeof message.error !== "string"
      ) {
        return;
      }

      message._key = Date.now();
      setMessages([...messages, message]);

      setTimeout(() => {
        setMessages((current) => current.filter((m) => m !== message));
      }, 10000);
    },
    [messages],
  );

  const [trash, setTrashBase] = useState(false);
  const setTrash = useCallback((value) => {
    setTrashBase(value);
    setEdit(null);
  }, []);

  const [activeFolder, setActiveFolderBase] = useState(null);
  const setActiveFolder = useCallback(
    (folder) => {
      setActiveFolderBase(folder);
      setEdit(null);
      setTrash(false);
      setSelected([]);
    },
    [setTrash],
  );

  const [selected, setSelected] = useState([]);
  const [clipboard, setClipboard] = useState([]);
  const setSelecting = useCallback((value) => {
    setSelectingBase(value);
    setSelected([]);
  }, []);

  // const { files, isLoadingFiles, setFiles } = useFiles(activeFolder, trash);

  const prepareUpload = useCallback(
    (filesToUpload) => {
      if (filesToUpload.length === 0) {
        return;
      }

      let list = [];
      for (let i = 0, file; (file = filesToUpload[i]); i++) {
        const data = {
          ref: file,
          key: [
            Date.now(),
            file.name.replace(/[^0-9a-zA-Z-_]+/g, ""),
            file.lastModified,
            file.size,
          ].join(":"),
          status: "queued",
          progress: 0,
          folder: activeFolder,
        };

        list.push(data);
      }

      const queue = [...uploadQueue, ...list];
      queue[0].status = "uploading";
      setUploadQueue(queue);
    },
    [uploadQueue, activeFolder],
  );

  useEffect(() => {
    if (uploadQueue.length === 0) {
      return;
    }
  }, [uploadQueue]);

  const context = useMemo(
    () => ({
      /*
      folders,
      setFolders,
      */
      activeFolder,
      setActiveFolder,
      /*
      files,
      setFiles,
      isLoadingFiles,
      */
      dragData,
      setDragData,
      uploadQueue,
      setUploadQueue,
      keywords,
      setKeywords,
      edit,
      setEdit,
      type: "image", // image | file
      selecting,
      selected,
      setSelected,
      setSelecting,
      clipboard,
      setClipboard,
      accept,
      trash,
      setTrash,
      error,
      setError,
      messages,
      addMessage,
      prepareUpload,
      mode,
      apiPath,
    }),
    [
      // folders,
      activeFolder,
      setActiveFolder,
      /*
      files,
      setFiles,
      isLoadingFiles,
      */
      dragData,
      uploadQueue,
      keywords,
      edit,
      selecting,
      setSelecting,
      selected,
      clipboard,
      trash,
      setTrash,
      error,
      messages,
      addMessage,
      prepareUpload,
      mode,
      apiPath,
    ],
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}
