"use client";

import React from "react";

import NoticeList from "@kenstack/components/Notice/List";

import FileList from "./FileList";
import FolderList from "./Folders/List";
import Editor from "./Editor";

import { useLibrary, useLibraryStore } from "./context";

import "./library.scss";

export default function Library() {
  // set container class based on image or file type library

  const store = useLibraryStore();
  const { edit } = useLibrary();
  return (
    <div className="admin-library">
      <NoticeList store={store} />

      <div className="flex flex-grow overflow-hidden">
        <div className="w-1/4 flex flex-col mr-2 h-full overflow-hidden">
          <FolderList />
        </div>
        <div className="w-3/4 flex flex-col h-full overflow-hidden">
          {edit ? <Editor id={edit} /> : <FileList />}
        </div>
      </div>
    </div>
  );
}
