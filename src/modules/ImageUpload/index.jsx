import { useState, useEffect } from "react";
import sentenceCase from "@kenstack/utils/sentenceCase";

import Browse from "./Browse";
import Thumbnail from "./Thumbnail";

export default function ImageUpload({
  name,
  label: initialLabel,
  value,
  disabled,
  accept = "image/png, image/jpeg, image/jpg, image/gif, image/svg+xml, image/webp",
  apiPath,
  invalidateQueries,
}) {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  if (!name) {
    throw Error("'name' is required");
  }

  if (!apiPath) {
    throw Error("'apiPath' is required");
  }

  const props = {
    name,
    value: localValue,
    setValue: setLocalValue,
    disabled,
    accept,
    apiPath,
    invalidateQueries,
  };

  const label = initialLabel === undefined ? sentenceCase(name) : initialLabel;

  return (
    <div className="flex flex-col w-auto max-w-48 border border-gray-200 rounded px-4 py-2">
      {label && <label className="label mb-2">{label}</label>}

      <div className="flex justify-center">
        <Thumbnail {...props} />
      </div>
      <div className="flex justify-center mt-4">
        <Browse {...props} />
      </div>
    </div>
  );
}
