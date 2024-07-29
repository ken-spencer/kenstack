import React, { useCallback } from "react";

import UploadFiles from "./UploadFiles";
import File from "./File";
import Toolbar from "./Toolbar";
import Spinner from "../../../admin/Loading";

// var fileToken = null;
// var { actions, context } = store;

import useLibrary from "../useLibrary";
import Filler from "./Filler";

function handleDragEnter(evt) {
  evt.preventDefault();
  evt.stopPropagation();
}

function handleDragOver(evt) {
  evt.preventDefault();
  evt.stopPropagation();

  var dt = evt.dataTransfer;
  if (dt.getData("action") === "moveFile") {
    dt.effectAllowed = dt.dropEffect = "none";
  }
}

export default function FileList() {
  const {
    files,
    isLoadingFiles,
    keywords,
    clipboard,
    trash,
    prepareUpload,
  } = useLibrary();
  // const [loading, setLoading] = useState(true);

  const handleDragDrop = useCallback(
    (evt) => {
      evt.preventDefault();
      evt.stopPropagation();

      var dt = evt.dataTransfer;
      prepareUpload(dt.files);
    },
    [prepareUpload],
  );

  return (
    <main className={" h-full"}>
      <Toolbar />

      {(() => {
        if (isLoadingFiles) {
          return <Spinner />;
        }

        if (files.length === 0 && keywords.length) {
          return <div className="text-center">No results</div>;
        }

        const filesToRender = clipboard.length
          ? files.filter((f) => !clipboard.includes(f.id))
          : files;
        if (trash) {
          return (
            <div className="admin-body">
              <Files files={filesToRender} />
            </div>
          );
        }

        return (
          <div
            className="admin-body"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDrop={handleDragDrop}
          >
            <UploadFiles />

            {filesToRender.length ? (
              <Files files={filesToRender} />
            ) : (
              <div className="admin-library-drop-files">Drop files here</div>
            )}
          </div>
        );
      })()}
    </main>
  );
}

function Files({ files }) {
  if (files.length === 0) {
    return null;
  }
  return (
    <div className="admin-library-files">
      {files.map((file, key) => {
        return <File key={file.id || file.uploadKey} file={file} />;
      })}
      <Filler />
    </div>
  );
}
