import React, { useState, useEffect } from "react";

import { useLibrary } from "../context";

import apiAction from "@kenstack/client/apiAction";
import EXIF from "exif-js";

import useFiles from "./useFiles";

import ProgressIcon from "@kenstack/icons/Progress";

const orientations = {
  // 3: "rotate-180",
  // 6: "-rotate-90",
  // 8: "rotate-90",
};

async function uploadToPresigned({ uploadUrl, fields }, file, addMessage) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
  formData.append("file", file);

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Accept: "application/json", // Request a JSON response from Cloudinary
    },
    body: formData,
  });

  // const contentType = res.headers.get("content-type");
  const json = await res.json();

  return json;
}

export default function Upload({ file }) {
  const { apiPath, addMessage, activeFolder, trash, setUploadQueue } =
    useLibrary();
  const { refetchFiles } = useFiles(activeFolder, trash);

  // const progressRef = useRef();
  const [src, setSrc] = useState(null);
  const [orientationClass, setOrientationClass] = useState("");
  // const [progress, setProgress] = useState(0);

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
        // TODO this is not currently doing anything. Remove soon if not needed
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

      const onProgress = (value) => {
        // setProgress(value);
      };
      let uploadRes;
      try {
        uploadRes = await uploadToPresigned(
          res,
          file.ref,
          onProgress,
          addMessage,
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e.message);
        addMessage({
          error: `There was an unexpected problem loading ${filename}:  ${e.message}`,
        });
        dequeue();
        return;
      }

      if (uploadRes.error) {
        addMessage({
          error: `There was an unexpected problem loading ${filename}:  ${uploadRes.error.message}`,
        });
        dequeue();
        return;
      }

      const completeRes = await apiAction(apiPath + "/upload-complete", {
        // tmpName: res.tmpName,
        filename,
        folder: activeFolder,
        data: uploadRes,
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
      <img
        src={src}
        alt=""
        className={
          "admin-library-thumbnail" +
          (orientationClass ? " " + orientationClass : "")
        }
      />
      {file.status === "uploading" && (
        <div className="flex items-center justify-center absolute top-0 left-0 right-0 bottom-0 bg-gray-800 bg-opacity-20">
          <ProgressIcon
            className="w-24 h-24 text-gray-100 animate-spin"
            style={{ animationDuration: "2s" }}
          />
        </div>
      )}
      {/*
      <div className="admin-library-progress" ref={progressRef}>
        <div
          className="admin-library-progress-indicator"
          style={{
            width: progress + "%",
          }}
        />
      </div>
      */}
    </div>
  );
}
