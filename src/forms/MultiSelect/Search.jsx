import { useRef, useEffect } from "react";

import SearchIcon from "@kenstack/icons/Search";
import ClearIcon from "@kenstack/icons/Clear";

export default function Search({
  keywords,
  setKeywords,
  placeholder="Enter search",
  autofocus = false,
}) {
  const ref = useRef();
  useEffect(() => {
    if (autofocus) {
      ref.current.focus();
    }
  }, [autofocus]);
  
  return (
    <div
      className="flex items-center px-1"
      onClick={() => ref.current.focus()}
    >
      <SearchIcon className="dark:text-white" />
      <input
        className="flex-1 w-full px-1 appearance-none border-none focus:outline-none focus:ring-0  bg-transparent focus:outline-none dark:text-white"
        placeholder={placeholder}
        value={keywords}
        onChange={(evt) => {
          setKeywords(evt.target.value);
        }}
        ref={ref}
      />
      <button
        type="button"
        className={keywords.length ? "" : "invisible"}
        onClick={() => {
          setKeywords("")
          ref.current.focus();
        }}
        
      >
        <ClearIcon className="dark:text-white"/>
      </button>
    </div>
  )
}
