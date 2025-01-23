"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";

import { createStore } from "zustand";
import { useStore } from "zustand";
import messageMixin from "@kenstack/mixins/messageStore";

// import defaultFile from "./FileList/defaultFile";
// import useFiles from "./FileList/useFiles";

const accept = ["image/jpeg", "image/gif", "image/png", "image/webp"];

const LibraryContext = createContext({});
const messageStore = createStore((set) => messageMixin(set));

const store = createStore((set) => ({
  activeFolder: null,
  edit: null,
  trash: false,
  selected: [],
  keywords: "",
  uploadQueue: [],

  setActiveFolder: (activeFolder) =>
    set({
      activeFolder,
      edit: null,
      trash: false,
      selected: [],
      keywords: "",
    }),
  setEdit: (edit) => set({ edit }),
  setTrash: (trash) =>
    set({
      trash,
      edit: null,
      keywords: "",
    }),
  setSelected: (selected) => set({ selected }),
  setKeywords: (keywords) =>
    set({
      keywords,
      activeFolder: null,
    }),

  setUploadQueue: (uploadQueue) => set({ uploadQueue }),
  prepareUpload: (filesToUpload) =>
    set((state) => {
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

      const queue = [...state.uploadQueue, ...list];
      queue[0].status = "uploading";
      return { ietUploadQueue: queue };
    }),
}));

const LibraryProvider = ({
  mode = "image", // image | file
  edit: editDefault = null,
  children,
  apiPath,
}) => {
  // const [folders, setFolders] = useState([]);

  const [dragData, setDragData] = useState({});
  const [selecting, setSelectingBase] = useState(false);
  const [error, setError] = useState("");

  const addMessage = messageStore.getState().addMessage;

  const [clipboard, setClipboard] = useState([]);
  const setSelecting = useCallback((value) => {
    setSelectingBase(value);
    setSelected([]);
  }, []);

  // const { files, isLoadingFiles, setFiles } = useFiles(activeFolder, trash);

  const context = useMemo(
    () => ({
      // activeFolder,
      // setActiveFolder,
      dragData,
      setDragData,
      // keywords,
      // setKeywords,
      // edit,
      // setEdit,
      type: "image", // image | file
      selecting,
      // selected,
      // setSelected,
      setSelecting,
      clipboard,
      setClipboard,
      accept,
      // trash,
      // setTrash,
      error,
      setError,
      addMessage,
      mode,
      apiPath,
      messageStore,
    }),
    [
      dragData,
      selecting,
      setSelecting,
      clipboard,
      error,
      addMessage,
      mode,
      apiPath,
    ],
  );

  return (
    <LibraryContext.Provider value={context}>
      {children}
    </LibraryContext.Provider>
  );
};

const useLibrary = (selector = undefined) => {
  const context = useContext(LibraryContext);

  const keys = Object.keys(context);
  if (!keys.length) {
    throw Error(
      "Unable to fetch library  context. Please ensure that the Provider is present",
    );
  }

  const state = useStore(store, selector);
  return { ...context, ...state };
};

export { LibraryContext, useLibrary, LibraryProvider };
