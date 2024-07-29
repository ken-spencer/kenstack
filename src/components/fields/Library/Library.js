import React from "react";

import Title from "../../admin/Title";
// import Item from "@thaumazo/forms/Grid/Item";
// import Grid from "@thaumazo/forms/Grid";
// import ErrorBoundary from "../../admin/ErrorBoundary";

import ToggleTrash from "./ToggleTrash";
import FileList from "./FileList";
import FolderList from "./Folders/List";
import Search from "./Search";
import Editor from "./editor/Editor";

import useLibrary from "./useLibrary";

import "./library.scss";

export default function Library() {
  // set container class based on image or file type library

  const { edit } = useLibrary();

  return (
    <div className="admin-library">
      <header className="admin-toolbar">
        <div className="admin-toolbar-left">
          <Search />
        </div>
        <Title>Image library</Title>
        <div className="admin-toolbar-right">
          <ToggleTrash />
        </div>
      </header>

      <div className="flex flex-grow m-4 overflow-hidden">
        <div className="w-1/4 flex flex-col mr-4 h-full overflow-hidden">
          <FolderList />
        </div>
        <div className="w-3/4 flex flex-col h-full overflow-hidden">
          {edit ? <Editor /> : <FileList />}
        </div>
      </div>
    </div>
  );
}
