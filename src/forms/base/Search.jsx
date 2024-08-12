import React, {
  forwardRef,
  useCallback,
  useRef,
  useEffect,
  useState,
} from "react";

import styles from "../Button/button.module.scss";

import Input from "./Input";
import IconButton from "../IconButton";
import MagnifyingGlassIcon from "../icons/MagnifyingGlassIcon";
import XCircleIcon from "../icons/XCircleIcon";

const Search = ({ handleClear, ...props }, refProp) => {
  const defaultRef = useRef();
  const ref = refProp || defaultRef;

  return (
    <Input
      start={<MagnifyingGlassIcon width="1.5rem" height="1.5rem" />}
      end={<ClearButton inputRef={ref} handleClear={handleClear} />}
      {...props}
      ref={ref}
    />
  );
};

function ClearButton({ inputRef, handleClear }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
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
  }, [visible, inputRef]);

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
      onClick={handleClick}
      className={
        styles.clearButton +
        " " +
        (visible ? styles.opaque : styles.transparent)
      }
    >
      <XCircleIcon width="1.25rem" height="1.25rem" />
      {/*
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        width="1.25rem"
        height="1.25rem"
      >
        <path
          fillRule="evenodd"
          d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z"
          clipRule="evenodd"
        />
      </svg>
    */}
    </IconButton>
  );
}

Search.displayName = "Search";
export default forwardRef(Search);
