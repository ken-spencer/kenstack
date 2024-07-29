import React from "react";

import SearchInput from "@thaumazo/forms/base/Search";
import useLibrary from "./useLibrary";

export default function Search() {
  const { keywords, setKeywords } = useLibrary();
  return (
    <SearchInput
      name="keywords"
      autoComplete="off"
      placeholder="Search"
      value={keywords}
      onChange={(evt) => {
        setKeywords(evt.value);
      }}
      handleClear={() => {
        setKeywords("");
      }}
    />
  );
}
