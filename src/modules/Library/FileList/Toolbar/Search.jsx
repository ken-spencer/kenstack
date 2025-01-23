import React from "react";

import { useLibrary } from "../../context";

import SearchIcon from "@kenstack/icons/Search";
import ClearIcon from "@kenstack/icons/Clear";

export default function Search() {
  const { keywords, setKeywords } = useLibrary();
  return (
    <div className="flex items-center">
      <SearchIcon />
      <input
        className="appearance-none border-none bg-transparent focus:outline-none flex-1 w-32"
        name="keywords"
        autoComplete="off"
        placeholder="Search"
        value={keywords}
        onChange={(evt) => {
          setKeywords(evt.target.value);
        }}
      />
      <button
        className={keywords.length ? "" : "invisible"}
        onClick={() => setKeywords("")}
      >
        <ClearIcon />
      </button>
    </div>
  );
}
