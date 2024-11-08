"use client";

import { createContext, useContext, useState, useEffect, useMemo } from "react";
const LibraryEditorContext = createContext({});

import apiAction from "@kenstack/client/apiAction";
import { useQuery } from "@tanstack/react-query";
import useLibrary from "../useLibrary";

export function LibraryEditProvider({ children }) {
  const { apiPath, edit: id, addMessage } = useLibrary();
  const [mode, setMode] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["editor", id],
    queryFn: () => apiAction(apiPath + "/edit", { id }),
  });

  const context = useMemo(
    () => ({
      id,
      apiPath,
      addMessage,
      mode,
      setMode,
      isLoading,
      error,
      file: data?.file ?? null,
      data,
    }),
    [id, apiPath, addMessage, mode, isLoading, error, data],
  );

  return (
    <LibraryEditorContext.Provider value={context}>
      {children}
    </LibraryEditorContext.Provider>
  );
}

export function useLibraryEditor() {
  const context = useContext(LibraryEditorContext);

  const keys = Object.keys(context);
  if (!keys.length) {
    throw Error(
      "Unable to fetch LibraryEditorContext. Please ensure that the provider is present",
    );
  }

  return context;
}
