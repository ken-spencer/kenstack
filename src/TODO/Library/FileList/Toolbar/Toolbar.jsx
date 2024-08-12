import React from "react";
import Browse from "./Browse";
// import SB from "SB/js/SB";

import Button from "@admin/forms/Button";

import PasteButton from "./PasteButton";
import DeleteButton from "./DeleteButton";
import DeleteForever from "./DeleteForever";

import ContentCutIcon from "@mui/icons-material/ContentCut";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import IndeterminateCheckBoxIcon from "@mui/icons-material/IndeterminateCheckBox";
// import DeleteIcon from "@mui/icons-material/Delete";

// import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
// import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
// import CancelIcon from "@mui/icons-material/Cancel";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";

import useLibrary from "../../useLibrary";

export default function Toolbar() {
  const {
    files,
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
    <div className="admin-toolbar">
      <div className="admin-toolbar-left">
        {selecting === false ? (
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
              <Button
                startIcon={<ContentCutIcon />}
                key="cut"
                type="button"
                disabled={selected.length === 0}
                onClick={() => {
                  const clipboard = [...selected];
                  clipboard.activeFolder = activeFolder;
                  setClipboard(clipboard);
                  setSelected([]);
                }}
              >
                Cut
              </Button>
            ) : (
              <PasteButton />
            )}
          </>
        )}
      </div>
      <div className="admin-toolbar-right">
        {selecting === false ? (
          <Button
            startIcon={<CheckBoxIcon />}
            key="select"
            disabled={files.length === 0}
            type="button"
            onClick={() => setSelecting(true)}
          >
            Select
          </Button>
        ) : (
          <>
            {(() => {
              if (files.length === 0) {
                return null;
              }

              if (selected.length < files.length) {
                return (
                  <Button
                    key="select-all"
                    type="button"
                    startIcon={
                      selected.length === 0 ? (
                        <CheckBoxOutlineBlankIcon />
                      ) : (
                        <IndeterminateCheckBoxIcon />
                      )
                    }
                    onClick={() => {
                      setSelected(() => {
                        return files.map((f) => f.id);
                      });
                    }}
                  >
                    Select all
                  </Button>
                );
              } else {
                return (
                  <Button
                    startIcon={<CheckBoxIcon />}
                    key="deselect-all"
                    type="button"
                    onClick={() => {
                      setSelected([]);
                    }}
                  >
                    Deselect all
                  </Button>
                );
              }
            })()}
            <Button
              startIcon={<ArrowBackIosIcon />}
              key="cancel"
              type="button"
              onClick={() => setSelecting(false)}
            >
              Done
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
