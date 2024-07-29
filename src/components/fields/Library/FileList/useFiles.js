import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import listAction from "./api/listAction";

const fetchFiles = async (activeFolder, trash) => {
  const res = await listAction(activeFolder, trash);
  if (res.success) {
    return res.files;
  } else {
    throw new Error(res.error || "There was a problem");
  }
};

export default function useFiles(activeFolder, trash) {
  if (activeFolder === undefined) {
    throw Error("No active folder");
  }

  const {
    data: files,
    isLoading: isLoadingFiles,
    refetch,
  } = useQuery({
    queryKey: ["files", activeFolder, trash],
    queryFn: () => fetchFiles(activeFolder, trash),
    initialData: [],
  });

  const queryClient = useQueryClient();
  const setFiles = useCallback(
    (value) => {
      queryClient.setQueryData(["files", activeFolder, trash], value);
    },
    [queryClient, activeFolder, trash],
  );

  return { files, isLoadingFiles, setFiles, refetchFiles: refetch };
}
