"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";

import { keepPreviousData, useQuery, useQueryClient } from "@kenstack/query";

import { usePathname, useParams } from "next/navigation";
// import Cookies from "js-cookie";

import useDebounce from "@kenstack/hooks/useDebounce";

// import debounce from "lodash-es/debounce";
import apiAction from "@kenstack/client/apiAction";

import { createStore } from "zustand";
import messageMixin from "@kenstack/mixins/messageStore";
const messageStore = createStore((set) => messageMixin(set));

const AdminListContext = createContext({});

export function AdminListProvider({
  name: modelName,
  admin,
  // userId,
  initialData,
  claims,
  sortBy: initialSortBy,
  keywords: initialKeywords,
  children,
}) {
  const userId = claims.sub;
  const pathname = usePathname();
  const params = useParams();
  // const apiPath = path + "/api";
  // const cookieKey = "admin-list-" + modelName;

  const apiPath = useMemo(() => {
    const suffix = params.admin ? params.admin.join("/") : "";
    if (suffix.length) {
      return pathname.slice(0, -suffix.length) + "api/" + suffix;
    } else {
      return pathname + "/api/" + suffix;
    }
  }, [pathname, params]);

  const [selected, setSelected] = useState(new Set());
  // const [error, setError] = useState();

  const [sortBy, setSortBy] = useState(initialSortBy);

  const [keywords, debouncedKeywords, setKeywords] = useDebounce(
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
  const queryKey = useMemo(
    () => ["admin-list", modelName, sortBy, debouncedKeywords],
    [modelName, sortBy, debouncedKeywords],
  );

  const queryClient = useQueryClient();
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey,
      queryFn: () => initialData,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  const {
    data,
    error: queryError,
    isLoading,
    refetch,
    // isPreviousData,
  } = useQuery({
    queryKey,
    queryFn: () => {
      return apiAction(apiPath + "/load", {
        modelName,
        sortBy,
        keywords,
      });
    },
    // initial data must be conditional or we never query
    // initialData:
    //   initialSortBy === sortBy && initialKeywords === keywords
    //     ? initialData
    //     : undefined,
    // staleTime: typeof(window) ? Infinity : 0,
    // initialDataUpdatedAt: Date.now(),
    placeholderData: keepPreviousData,
    // placeholderData: (previousData) => {
    //   if (previousData) return previousData;

    //   return initialData;
    // },
    // keepPreviousData: true,
  });

  /*
  const reload = useCallback(() => {
    setDoRelaod((count) => count + 1);
  }, []);
  */

  // const setSortBy = useCallback(
  //   (sort) => {
  //     // cache.set("sortBy", sort);
  //     if (sort) {
  //       Cookies.set(cookieKey + "Sort", sort.join(","), {
  //         sameSite: "strict",
  //         expires: 1 / 2,
  //         pathname,
  //       });
  //     }
  //     setSortByBase(sort);
  //   },
  //   [pathname, cookieKey],
  // );

  // const setKeywords = useCallback(
  //   (value) => {
  //     Cookies.set(cookieKey + "Keywords", value, {
  //       sameSite: "strict",
  //       expires: 1 / 2,
  //       pathname,
  //     });
  //     setKeywordsBase(value);
  //     // setDebouncedKeywords(value);
  //   },
  //   [cookieKey, pathname, setKeywordsBase],
  // );

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
      total: data?.total ?? null,
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
      refetch,
      isLoading,
      messageStore,
      queryKey,
      apiPath,
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
      refetch,
      isLoading,
      queryKey,
      apiPath,
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

export { AdminListContext };
