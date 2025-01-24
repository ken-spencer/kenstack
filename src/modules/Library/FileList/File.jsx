import React, { useState, useRef, useCallback } from "react";

import { useLibrary } from "../context";
import useFiles from "./useFiles";
import useMutation from "@kenstack/hooks/useMutation";

import globals from "../globals";

import apiAction from "@kenstack/client/apiAction";

import SettingsIcon from "@kenstack/icons/Settings";

export default function File({ file }) {
  const [dragging, setDragging] = useState();

  const { files, setFiles } = useFiles();
  const {
    mode,
    dragData,
    setDragData,
    selecting,
    selected,
    setSelected,
    activeFolder,
    trash,
    setEdit,
    addMessage,
    apiPath,
  } = useLibrary();
  const ref = useRef();
  const imgRef = useRef();

  const saveMoveMutation = useMutation({
    queryKey: ["files", activeFolder, false],
    mutationFn: (post) => apiAction(apiPath + "/save-move", post),
    onError: ({ error }) => {
      addMessage({ error: error.message });
    },
  });

  const handleDragStart = useCallback(
    (evt) => {
      setDragging(true);

      const idArray = files.map((f) => f.id);
      globals.initialOrder = idArray.join(",");

      const dt = evt.dataTransfer;
      dt.clearData();
      dt.effectAllowed = "move";
      setDragData({
        type: "files",
        id: file.id,
      });
      // dt.setData("type", "library-file");
      //dt.setData("application/json", file.id);

      /* // Works in FF, but not Chrome or Safari atm.
    const clone = ref.current.cloneNode(true);
    clone.style.position = "absolute";
    clone.style.left = "-999px";
    clone.style.transition = 'none';
    clone.style.transform = "scale(0.25)";
    document.body.appendChild(clone);

    const rect = ref.current.getBoundingClientRect();
    const cloneRect = clone.getBoundingClientRect();
    const offsetX = evt.clientX - rect.left;
    const offsetY = evt.clientY - rect.top;

    const scale = cloneRect.width / rect.width;

    const scaledOffsetX = offsetX * scale;
    const scaledOffsetY = offsetY * scale;

    dt.setDragImage(clone, scaledOffsetX, scaledOffsetY);

    setTimeout(() => {
      document.body.removeChild(clone);
    }, 0);
    */

      return true;
    },
    [file, files, setDragData],
  );

  const handleDragEnter = useCallback(
    (evt) => {
      evt.preventDefault();
      evt.stopPropagation();

      // const dt = evt.dataTransfer;
      if (dragData.type !== "files") {
        return;
      }

      const id = dragData.id;
      if (id === file.id) {
        return;
      }

      setFiles(() => {
        const index1 = files.findIndex((f) => f.id === id);
        if (index1 === -1) {
          return files;
        }

        const newFiles = [...files];
        const [removed] = newFiles.splice(index1, 1);

        const index2 = newFiles.findIndex((f) => f.id === file.id);
        if (index2 === -1) {
          return files;
        }

        newFiles.splice(index2 < index1 ? index2 : index2 + 1, 0, removed);

        // swap the two files
        // [newFiles[index1], newFiles[index2]] = [newFiles[index2], newFiles[index1]];
        return newFiles;
      });
    },
    [file, dragData, files, setFiles],
  );

  const handleDragEnd = useCallback(
    (evt) => {
      // const id = dragData.id;

      setDragging(false);
      setDragData({});

      if (globals.dropFolder !== false) {
        globals.dropFolder = false;
        return;
      }

      evt.preventDefault();
      const idArray = files.map((f) => f.id);

      // check if a move happened before saving
      if (globals.initialOrder !== idArray.join(",")) {
        saveMoveMutation.mutate({ idArray, activeFolder });
      }

      globals.initialOrder = "";
    },
    [activeFolder, files, saveMoveMutation, setDragData],
  );

  let src = null;
  if (mode === "file") {
    //src = getIcon(file);
  } else {
    src = file.url;
  }

  var events = {};
  if (selecting || trash) {
    events = {
      onClick: () => {
        if (selected.includes(file.id)) {
          setSelected(selected.filter((s) => s !== file.id));
        } else {
          setSelected([...selected, file.id]);
        }
      },
    };
  } else {
    events = {
      // onClick: handleClick,
      //  onDoubleClick: this.handleDoubleClick,
      onDragStart: handleDragStart,
      onDragEnter: trash ? null : handleDragEnter,
      onDragEnd: handleDragEnd,
      draggable: true,
    };
  }

  /*
  var styles = {};
  if (file.transitioned === false && file.uploading === false) {
    styles = {
      //   marginTop: '10px',
      transform: "translateY(10px)",
      transition: "none",
      opacity: 0,
      visibility: "hidden",
    };
  }
  */

  return (
    <div
      className={
        "admin-library-file" +
        (selected.includes(file.id) ? " selected" : "") +
        (dragging ? " dragging" : "")
      }
      {...events}
      ref={ref}
      // style={styles}
    >
      <img
        className="admin-library-thumbnail"
        src={src}
        draggable="false"
        alt={file.alt || ""}
        ref={imgRef}
      />
      {selecting || trash || (
        <button
          className="absolute top-1 right-1 z-10 rounded-full bg-white/50"
          onClick={(evt) => {
            evt.stopPropagation();
            setEdit(file.id);
          }}
        >
          <SettingsIcon className="opacity-6o" />
        </button>
      )}
      <div className="admin-library-filename">{file.filename}</div>
    </div>
  );
}
