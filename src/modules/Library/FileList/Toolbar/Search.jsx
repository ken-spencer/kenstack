import React from "react";

import SearchInput from "@kenstack/forms/base/Search";
import { useLibrary } from "../../context";

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
      clear={() => {
        setKeywords("");
      }}
    />
  );
}
