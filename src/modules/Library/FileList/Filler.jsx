import { useRef, useEffect, useState } from "react";
import { useLibrary } from "../context";

export default function Filler() {
  const { files, setFiles, dragData } = useLibrary();
  const ref = useRef();
  const [span, setSpan] = useState(0);

  useEffect(() => {
    const node = ref.current;
    const grid = node.closest(".admin-library-files");

    // const items = grid.querySelectorAll(".admin-library-file");
    const numColumns =
      getComputedStyle(grid).gridTemplateColumns.split(" ").length;

    // There is a gap in the last row
    setSpan(numColumns - (files.length % numColumns));
  }, [files]);

  return (
    <div
      className={span ? `col-span-${span}` : "hidden"}
      ref={ref}
      onDragEnter={(evt) => {
        evt.preventDefault();
        evt.stopPropagation();

        // const dt = evt.dataTransfer;
        if (dragData.type !== "files") {
          return;
        }

        const { id } = dragData;
        const last = files.at(-1);

        if (last.id === id) {
          return;
        }

        const newFiles = [...files];
        const index = files.findIndex((f) => f.id === id);
        const [removed] = newFiles.splice(index, 1);
        newFiles.push(removed);

        setFiles(newFiles);
      }}
    />
  );
}
