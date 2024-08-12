import React from "react";
/*
import Image from "./Image";
import File from "./File";
import ImageDetails from "./ImageDetails";
import FileDetails from "./FileDetails";
import Icon from "@mui/icons-material/InsertEmoticon";
*/

import Body from "./Body";
import useLibrary from "../useLibrary";
import loadAction from "./api/loadAction";
import { useQuery } from "@tanstack/react-query";

import Toolbar from "./Toolbar";
import Spinner from "@admin/components/Loading";
import ErrorIndicator from "@admin/components/admin/ErrorIndicator";

export default function Editor() {
  const { edit } = useLibrary();
  const {
    data,
    isLoading,
    error,
    // refetch,
  } = useQuery({
    queryKey: ["edit", edit],
    queryFn: () => loadAction(edit.id),
  });

  return (
    <div className="flex flex-col fleg-grow  overflow-y-auto">
      <Toolbar isLoading={isLoading} file={data?.file} />
      {isLoading ? (
        <Spinner />
      ) : error || data.error ? (
        <ErrorIndicator />
      ) : (
        <Body file={data.file} id={edit} />
      )}
    </div>
  );
}
