import React, { useRef, useState, useEffect } from "react";

import useLibrary from "../useLibrary";

import apiAction from "@kenstack/client/apiAction";
import EXIF from "exif-js";

// import uploadCompleteAction from "./api/uploadCompleteAction";
import useFiles from "./useFiles";

const orientations = {
  3: "rotate-180",
  6: "-rotate-90",
  8: "rotate-90",
};

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
      } else {
        fail(
          new Error(
            `Was unable to upload file. status: ${xhr.status} ${xhr.responseText} `,
          ),
        );
      }
    });

    xhr.addEventListener("error", () => {
      fail(new Error("Failed to upload file: " + xhr.responseText));
    });

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("Accept", "application/json"); // Request JSON responses
    xhr.send(file);
  });
}

export default function Upload({ file }) {
  const { apiPath, addMessage, activeFolder, trash, setUploadQueue } =
    useLibrary();
  const { refetchFiles } = useFiles(activeFolder, trash);

  const progressRef = useRef();
  const [src, setSrc] = useState(null);
  const [orientationClass, setOrientationClass] = useState("");
  const [progress, setProgress] = useState(0);

  const dequeue = React.useCallback(() => {
    setUploadQueue((files) => {
      const queue = files.filter((f) => f.key !== file.key);
      if (queue.length > 0) {
        queue[0] = { ...queue[0], status: "uploading" };
      }
      return queue;
    });
  }, [file, setUploadQueue]);

  useEffect(() => {
    let reader = new FileReader();
    reader.onload = () => {
      setSrc(reader.result);
      const img = new Image();

      // Change orientation of rotated images.
      img.src = reader.result;
      img.onload = () => {
        EXIF.getData(img, function () {
          const orientation = EXIF.getTag(this, "Orientation");
          setOrientationClass(orientations[orientation] || "");
        });
      };
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
      const filename = file.ref.name;
      const res = await apiAction(apiPath + "/get-presigned-url", {
        filename,
        type: file.ref.type,
      });
      if (res.error) {
        addMessage({
          error: `There was an unexpected problem loading ${filename}:  ${res.error}`,
        });
        dequeue();
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
        addMessage({
          error: `There was an unexpected problem loading ${filename}:  ${e.message}`,
        });
        dequeue();
        return;
      }

      const completeRes = await apiAction(apiPath + "/upload-complete", {
        tmpName: res.tmpName,
        filename: res.filename,
        folder: activeFolder,
      });

      dequeue();
      if (completeRes.error) {
        addMessage({
          error: `There was an unexpected problem loading ${filename}:  ${completeRes.error}`,
        });
        return;
      }
      refetchFiles();
      /*
      setUploadQueue((files) => {
        const queue = files.filter((f) => f.key !== file.key);
        if (queue.length > 0) {
          queue[0] = { ...queue[0], status: "uploading" };
        }
        return queue;
      });
      */

      // const timeString = new Date().toISOString().split("T")[1].slice(0, -1);
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
      <img src={src} alt="" className={orientationClass} />
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
