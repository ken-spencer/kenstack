import React, { useRef, useState, useEffect } from "react";

import useLibrary from "../useLibrary";

import presignedUrlAction from "./api/presignedUrlAction";
import uploadCompleteAction from "./api/uploadCompleteAction";
import useFiles from "./useFiles";

async function uploadToPresigned(uploadUrl, file, onProgress = null) {
  await new Promise((success, fail) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percentCompleted = Math.round((event.loaded * 100) / event.total);
        if (onProgress) {
          onProgress(percentCompleted);
        }
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        success();

        // TODO make this into a promise.
      } else {
        fail(
          new Error(
            `Was unable to upload file. status: ${xhr.status} ${xhr.responseText} `,
          ),
        );
      }
    });

    xhr.addEventListener("error", () => {
      fail(new Error("Failed to upload file", xhr.responseText));
    });

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("Accept", "application/json"); // Request JSON responses
    xhr.send(file);
  });
}

export default function Upload({ file }) {
  const { activeFolder, trash, setUploadQueue } = useLibrary();
  const { refetchFiles } = useFiles(activeFolder, trash);

  const progressRef = useRef();
  const [src, setSrc] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let reader = new FileReader();
    reader.onload = () => {
      setSrc(reader.result);
    };
    reader.onerror = () => {
      // eslint-disable-next-line no-console
      console.error(reader.error);
    };
    reader.readAsDataURL(file.ref);
  }, [file.ref]);

  useEffect(() => {
    if (file.status !== "uploading") {
      return;
    }

    const putFile = async () => {
      const res = await presignedUrlAction(file.ref.name, file.ref.type);
      if (res.error) {
        // eslint-disable-next-line no-console
        console.error(res.error);
        return;
      }

      const onProgress = (progress) => {
        setProgress(progress);
      };
      try {
        await uploadToPresigned(res.uploadUrl, file.ref, onProgress);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e.message);
        return;
      }

      await uploadCompleteAction({
        tmpName: res.tmpName,
        filename: res.filename,
        folder: activeFolder,
      });

      setUploadQueue((files) => {
        const queue = files.filter((f) => f.key !== file.key);
        if (queue.length > 0) {
          queue[0] = { ...queue[0], status: "uploading" };
        }
        return queue;
      });

      // const timeString = new Date().toISOString().split("T")[1].slice(0, -1);
      refetchFiles();
    };

    putFile().catch((e) => {
      // eslint-disable-next-line no-console
      console.error(e);
    });
    // eslint-disable-next-line  react-hooks/exhaustive-deps
  }, [file]);

  if (!src) {
    return null;
  }

  return (
    <div className="admin-library-file">
      <img src={src} alt="" />
      <div className="admin-library-progress" ref={progressRef}>
        <div
          className="admin-library-progress-indicator"
          style={{
            width: progress + "%",
          }}
        />
      </div>
    </div>
  );
}
