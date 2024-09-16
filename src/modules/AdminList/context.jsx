"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useQuery } from "@tanstack/react-query";

import { usePathname } from "next/navigation";
import Cookies from "js-cookie";

import useDebounce from "@kenstack/hooks/useDebounce";

// import debounce from "lodash/debounce";
import apiAction from "@kenstack/client/apiAction";

const AdminListContext = createContext({});

export function AdminListProvider({
  admin,
  userId,
  initialData,
  //rows: initialRows,
  sortBy: initialSortBy,
  keywords: initialKeywords,
  children,
}) {
  const path = usePathname();
  const queryKey = "admin-list-" + admin.modelName;

  const [selected, setSelected] = useState(new Set());
  // const [error, setError] = useState();

  const [sortBy, setSortByBase] = useState(initialSortBy);
  const [keywords, debouncedKeywords, setKeywordsBase] = useDebounce(
    initialKeywords,
    300,
  );

  /*
  const [keywords, setKeywordsBase] = useState(initialKeywords);
  const [debouncedKeywords, setDebouncedKeywordsBase] = useState(keywords);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setDebouncedKeywords = useCallback(
    debounce((value) => setDebouncedKeywordsBase(value), 500),
    [],
  );
  */

  const {
    data,
    error: queryError,
    isLoading,
  } = useQuery({
    queryKey: [queryKey, sortBy, debouncedKeywords],
    queryFn: () => {
      return apiAction(path + "/api/load", {
        modelName: admin.modelName,
        sortBy,
        keywords,
      });
    },
    initialData:
      initialSortBy === sortBy && initialKeywords === keywords
        ? initialData
        : undefined,
    // staleTime: typeof(window) ? Infinity : 0,
    initialDataUpdatedAt: Date.now(),
  });

  /*
  const reload = useCallback(() => {
    setDoRelaod((count) => count + 1);
  }, []);
  */

  const setSortBy = useCallback(
    (sort) => {
      // cache.set("sortBy", sort);
      if (sort) {
        Cookies.set(queryKey + "Sort", sort.join(","), {
          sameSite: "strict",
          expires: 1 / 2,
          path,
        });
      }
      setSortByBase(sort);
    },
    [path, queryKey],
  );

  const setKeywords = useCallback(
    (value) => {
      Cookies.set(queryKey + "Keywords", value, {
        sameSite: "strict",
        expires: 1 / 2,
        path,
      });
      setKeywordsBase(value);
      // setDebouncedKeywords(value);
    },
    [queryKey, path, setKeywordsBase],
  );

  const select = useCallback(
    (arg) => {
      if (Array.isArray(arg)) {
        arg = arg.filter((id) => userId != id);
        const newSelected = new Set(arg);
        setSelected(newSelected);
      } else {
        const newSelected = new Set(selected);
        newSelected.add(arg);
        setSelected(newSelected);
      }
    },
    [selected, userId],
  );

  const deselect = useCallback(
    (id) => {
      const newSelected = new Set(selected);
      newSelected.delete(id);
      setSelected(newSelected);
    },
    [selected],
  );

  const context = useMemo(
    () => ({
      rows: data?.rows ?? [],
      // setRows,
      admin,
      userId,
      select,
      deselect,
      selected,
      sortBy,
      setSortBy,
      keywords,
      setKeywords,
      // reload,
      setSelected,
      // error: error || queryError?.message || data?.error,
      error: queryError?.message || data?.error,
      isLoading,
    }),
    [
      admin,
      userId,
      selected,
      deselect,
      select,
      sortBy,
      setSortBy,
      keywords,
      setKeywords,
      // reload,
      data,
      //error,
      queryError,
      isLoading,
    ],
  );

  return (
    <AdminListContext.Provider value={context}>
      {children}
    </AdminListContext.Provider>
  );
}

export function useAdminList() {
  const context = useContext(AdminListContext);

  const keys = Object.keys(context);
  if (!keys.length) {
    throw Error(
      "Unable to fetch admin  context. Please ensure that the admin list Provider is present",
    );
  }

  return context;
}
