import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import apiAction from "@kenstack/client/apiAction";
import { useLibrary } from "../context";

const defaultFiles = [];

export default function useFiles() {
  const { activeFolder, trash, apiPath } = useLibrary();

  const {
    data,
    isLoading: isLoadingFiles,
    refetch,
  } = useQuery({
    queryKey: ["files", activeFolder, trash],
    queryFn: () => apiAction(apiPath + "/list", { activeFolder, trash }),
    // initialData: [],
    staleTime: 5 * 60 * 1000,
    cacheTime: 60 * 1000,
  });

  const files = isLoadingFiles ? defaultFiles : data.files || defaultFiles;

  const queryClient = useQueryClient();
  const setFiles = useCallback(
    (value) => {
      if (typeof value === "function") {
        queryClient.setQueryData(["files", activeFolder, trash], {
          files: value(files),
        });
      } else {
        queryClient.setQueryData(["files", activeFolder, trash], {
          files: value,
        });
      }
    },
    [queryClient, activeFolder, trash, files],
  );

  return { data, files, isLoadingFiles, setFiles, refetchFiles: refetch };
}
