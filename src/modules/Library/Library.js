"use client";

import React from "react";

import Notice from "@kenstack/components/Notice";

import FileList from "./FileList";
import FolderList from "./Folders/List";
import Editor from "./Editor";

import useLibrary from "./useLibrary";

import "./library.scss";

export default function Library() {
  // set container class based on image or file type library

  const { edit, messages } = useLibrary();
  return (
    <div className="admin-library">
      {messages.map((message) => (
        <Notice key={message._key} actionState={message} scroll />
      ))}

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
