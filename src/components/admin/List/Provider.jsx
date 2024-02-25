"use client";

import { usePathname } from "next/navigation";
import { useState, useCallback, useRef, useMemo } from "react";
import Context from "./Context";
import Cookies from "js-cookie";

import loadAction from "./loadAction";

let debounceTimeout;
export default function AdminListProvider({
  modelName,
  userId,
  rows: initialRows,
  sortBy: initialSortBy,
  keywords: initialKeywords,
  children,
}) {
  const path = usePathname();
  const key = "admin" + modelName;
  // const cache = new Cache(key, path);

  const [selected, setSelected] = useState(new Set());
  const [rows, setRows] = useState(initialRows);
  // const [doReload, setDoRelaod] = useState(0);
  const [error, setError] = useState();

  const [sortBy, setSortByBase] = useState(initialSortBy);
  const [keywords, setKeywordsBase] = useState(initialKeywords);

  /*
  const reload = useCallback(() => {
    setDoRelaod((count) => count + 1);
  }, []);
  */

  // const lastKeywords = useRef();
  const counter = useRef(0);
  const abortRef = useRef();

  const handleLoad = useCallback(
    (search = {}) => {
      counter.current++;
      let lastCount = counter.current;
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(
        () => {
          // abort prior fetch
          if (abortRef.current) {
            abortRef.current.abort();
          }

          abortRef.current = new AbortController();

          loadAction({
            modelName,
            sortBy: search.sortBy,
            keywords: search.keywords,
          })
            .then((result) => {
              // only update with the most recent results
              if (lastCount < counter.current) {
                return;
              }

              if (!result) {
                return;
              }

              if (result.error) {
                setError(result.error);
              } else if (result.rows) {
                setRows(result.rows);
              }
              // setIsLoaded(true);
            })
            .catch((e) => {
              // eslint-disable-next-line no-console
              console.error(e);

              if (lastCount < counter.current) {
                return;
              }

              setError(
                "There was an unexpected problem loading admin data. Please try again later.",
              );
            });
        },
        search.keywords ? 10 : 300,
      );

      //lastKeywords.current = keywords;
    },
    [modelName, setRows],
  );

  const setSortBy = useCallback(
    (sort) => {
      // cache.set("sortBy", sort);
      if (sort) {
        Cookies.set(key + "Sort", sort.join(","), { expires: 1 / 2, path });
      }
      setSortByBase(sort);
      handleLoad({ sortBy: sort });
    },
    [handleLoad, path, key],
  );

  const setKeywords = useCallback(
    (value) => {
      // cache.set("keywords", value);
      Cookies.set(key + "Keywords", value, { expires: 1 / 2, path });
      setKeywordsBase(value);
      handleLoad({ keywords: value });
    },
    [handleLoad, key, path],
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
      rows,
      setRows,
      modelName,
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
      error,
      handleLoad,
    }),
    [
      rows,
      modelName,
      userId,
      selected,
      deselect,
      select,
      sortBy,
      setSortBy,
      keywords,
      setKeywords,
      // reload,
      error,
      handleLoad,
    ],
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}
