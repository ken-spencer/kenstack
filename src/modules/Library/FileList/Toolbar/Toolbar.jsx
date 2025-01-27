import React from "react";
import Browse from "./Browse";
// import SB from "SB/js/SB";

import AdminIcon from "@kenstack/components/AdminIcon";

import Search from "./Search";
import PasteButton from "./PasteButton";
import DeleteButton from "./DeleteButton";
import DeleteForever from "./DeleteForever";
import ToggleTrash from "./ToggleTrash";

import CheckboxBlankIcon from "@kenstack/icons/CheckboxBlank";
import CancelIcon from "@kenstack/icons/Cancel";
import CutIcon from "@kenstack/icons/Cut";
import SelectAllIcon from "@kenstack/icons/SelectAll";
import DeselectAllIcon from "@kenstack/icons/Indeterminate";

import { useLibrary } from "../../context";
import useFiles from "../useFiles";

export default function Toolbar() {
  const { files } = useFiles();
  const {
    selecting,
    setSelecting,
    trash,
    selected,
    setSelected,
    clipboard,
    setClipboard,
    activeFolder,
  } = useLibrary();

  return (
    <div className="flex px-2 py-0.5 admin-border">
      <div className="flex flex-1">
        {selecting === false && trash === false ? (
          <>
            <Browse />
            <PasteButton />
          </>
        ) : (
          <>
            {trash === false ? (
              <DeleteButton />
            ) : (
              <>
                <DeleteForever />
                <DeleteButton />
              </>
            )}
            {clipboard.length === 0 ? (
              <AdminIcon
                key="cut"
                disabled={selected.length === 0}
                onClick={() => {
                  const newClipboard = [...selected];
                  newClipboard.activeFolder = activeFolder;
                  setClipboard(newClipboard);
                  setSelected([]);
                }}
                tooltip="Cut"
              >
                <CutIcon />
              </AdminIcon>
            ) : (
              <PasteButton />
            )}
          </>
        )}
      </div>
      <div className="flex">
        <Search />
        {selecting === false && trash === false ? (
          <AdminIcon
            key="select"
            disabled={files.length === 0}
            onClick={() => setSelecting(true)}
            tooltip="Select"
          >
            <CheckboxBlankIcon />
          </AdminIcon>
        ) : (
          <>
            {(() => {
              if (files.length === 0) {
                return null;
              }

              if (selected.length < files.length) {
                return (
                  <AdminIcon
                    key="select-all"
                    onClick={() => {
                      setSelected(() => {
                        return files.map((f) => f.id);
                      });
                    }}
                    tooltip="Select all"
                  >
                    <SelectAllIcon />
                  </AdminIcon>
                );
              } else {
                return (
                  <AdminIcon
                    key="deselect-all"
                    onClick={() => {
                      setSelected([]);
                    }}
                    tooltip="Deselect all"
                  >
                    <DeselectAllIcon />
                  </AdminIcon>
                );
              }
            })()}
            {trash || (
              <AdminIcon
                key="cancel-select"
                onClick={() => setSelecting(false)}
                tooltip="Done selecting"
              >
                <CancelIcon />
              </AdminIcon>
            )}
          </>
        )}
        <ToggleTrash />
      </div>
    </div>
  );
}
