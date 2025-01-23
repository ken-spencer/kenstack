import React from "react";

// import apiAction from "@kenstack/client/apiAction";
import Body from "./Body";
// import { useLibrary } from "../context";
import Notice from "@kenstack/components/Notice";

import { useLibraryEditor } from "./context";

import Toolbar from "./Toolbar";
import Spinner from "@kenstack/components/Loading";
// import ErrorIndicator from "@kenstack/components/ErrorIndicator";

export default function Editor() {
  const { data, isLoading, error } = useLibraryEditor();

  return (
    <div className="flex flex-col fleg-grow  overflow-y-auto">
      <Toolbar isLoading={isLoading} file={data?.file} />
      {isLoading ? (
        <Spinner />
      ) : error || data?.error ? (
        <Notice message={data} />
      ) : (
        <Body />
      )}
    </div>
  );
}
