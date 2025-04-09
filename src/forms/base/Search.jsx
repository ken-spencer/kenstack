import React, { useCallback, useRef, useEffect, useState } from "react";

import Input from "./Input";
import IconButton from "@kenstack/components/AdminIcon";
import MagnifyingGlassIcon from "@kenstack/icons/Search";
import XCircleIcon from "../icons/XCircleIcon";

export default function Search({ handleClear, clear, ref: refProp, ...props }) {
  if (handleClear) {
    throw Error("handleclear is now just clear");
  }

  const defaultRef = useRef();
  const ref = refProp || defaultRef;

  return (
    <Input
      start={<MagnifyingGlassIcon width="1.5rem" height="1.5rem" />}
      end={
        <ClearButton value={props.value} inputRef={ref} handleClear={clear} />
      }
      {...props}
      ref={ref}
    />
  );
}

function ClearButton({ value, inputRef, handleClear }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (value !== undefined) {
      return;
    }
    const input = inputRef.current;
    if (input.value.length) {
      setVisible(true);
    }

    const handleInput = (evt) => {
      if (visible && evt.target.value.length === 0) {
        setVisible(false);
      } else if (visible === false && evt.target.value) {
        setVisible(true);
      }
    };
    input.addEventListener("input", handleInput);
    return () => {
      input.removeEventListener("input", handleInput);
    };
  }, [value, visible, inputRef]);

  const handleClick = useCallback(() => {
    if (handleClear) {
      handleClear();
    } else {
      // todo clear the field if not handled
    }

    // inputRef.current.trigger("change");
  }, [handleClear]);

  return (
    <IconButton
      type="button"
      tooltip="Clear Search"
      onClick={handleClick}
      className={
        "text-gray-600 dark:text-gray-400 transition " +
        ((typeof value === "string" ? value.length : visible)
          ? "opacity-100"
          : "opacity-0")
      }
    >
      <XCircleIcon className="w-4 h-4" />
    </IconButton>
  );
}
