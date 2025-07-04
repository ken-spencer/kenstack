"use client";

import { createContext, useContext, useMemo } from "react";

import { createStore } from "zustand";
import { useStore } from "zustand";
import messageMixin from "@kenstack/mixins/messageStore";

const accept = ["image/jpeg", "image/gif", "image/png", "image/webp"];

const LibraryContext = createContext({});

const createLibraryStore = (props) =>
  createStore((set, get) => {
    const createSetter = (key) => (valueOrUpdater) => {
      set((state) => {
        const currentValue = state[key];
        const newValue =
          typeof valueOrUpdater === "function"
            ? valueOrUpdater(currentValue)
            : valueOrUpdater;
        return { [key]: newValue };
      });
    };

    return {
      type: "image", // image | file
      mode: "image", // figure out why we have both this and type
      accept,
      activeFolder: null,
      edit: null,
      trash: false,
      selected: [],
      selecting: false,
      keywords: "",
      uploadQueue: [],
      error: "",
      dragData: {},
      clipboard: [],
      ...props,
      setActiveFolder: (activeFolder) =>
        set({
          activeFolder,
          edit: null,
          trash: false,
          selected: [],
          keywords: "",
        }),
      setEdit: createSetter("edit"),
      setTrash: (trash) =>
        set({
          trash,
          edit: null,
          keywords: "",
        }),
      setSelected: createSetter("selected"),
      setSelecting: (selecting) =>
        set({
          selecting,
          selected: [],
        }),
      setKeywords: (keywords) =>
        set({
          keywords,
          activeFolder: null,
        }),

      setUploadQueue: createSetter("uploadQueue"),
      prepareUpload: (filesToUpload) =>
        set((state) => {
          if (filesToUpload.length === 0) {
            return state;
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
              folder: state.activeFolder,
            };

            list.push(data);
          }

          const queue = [...state.uploadQueue, ...list];
          queue[0].status = "uploading";
          return { uploadQueue: queue };
        }),
      setError: createSetter("error"),
      setDragData: createSetter("dragData"),
      setClipboard: createSetter("clipboard"),
      getQueryKey: () => {
        const { activeFolder, trash, keywords } = get();
        return ["files", activeFolder, trash, keywords];
      },
      ...messageMixin(set),
    };
  });

const LibraryProvider = ({
  mode = "image", // image | file
  edit = null,
  children,
  apiPath,
}) => {
  const store = useMemo(
    () =>
      createLibraryStore({
        apiPath,
        mode,
        edit,
      }),
    [apiPath, mode, edit]
  );

  return (
    <LibraryContext.Provider value={store}>{children}</LibraryContext.Provider>
  );
};

const useLibraryStore = () => {
  const context = useContext(LibraryContext);

  const keys = Object.keys(context);
  if (!keys.length) {
    throw Error(
      "Unable to fetch library  context. Please ensure that the Provider is present"
    );
  }

  return context;
};

const useLibrary = (selector = undefined) => {
  const store = useLibraryStore();
  const state = useStore(store, selector);
  return state;
};

export { LibraryContext, useLibrary, useLibraryStore, LibraryProvider };
