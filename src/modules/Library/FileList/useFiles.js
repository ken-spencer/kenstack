import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import apiAction from "@kenstack/client/apiAction";
import { useLibrary } from "../context";

const defaultFiles = [];

export default function useFiles() {
  const { getQueryKey, activeFolder, keywords, trash, apiPath } = useLibrary();
  const {
    data,
    isLoading: isLoadingFiles,
    refetch,
  } = useQuery({
    queryKey: getQueryKey(),
    queryFn: () =>
      apiAction(apiPath + "/list", { activeFolder, keywords, trash }),
    // initialData: [],
    staleTime: 5 * 60 * 1000,
    cacheTime: 60 * 1000,
  });

  const files = isLoadingFiles ? defaultFiles : data.files || defaultFiles;

  const queryClient = useQueryClient();
  const setFiles = useCallback(
    (value) => {
      const queryKey = getQueryKey();
      queryClient.setQueryData(queryKey, {
        files: typeof value === "function" ? value(files) : value,
      });
    },
    [queryClient, files, getQueryKey]
  );

  return { data, files, isLoadingFiles, setFiles, refetchFiles: refetch };
}
