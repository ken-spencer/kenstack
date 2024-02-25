"use client";

//import fetchJSON from "../../../utils/fetchJSON";
import { useState, useEffect, useMemo } from "react";

// import { usePathname } from "next/navigation";

import Context from "./Context";

// import Loading from "../Loading";

export default function AdminEditProvider({
  modelName,
  isNew,
  row: initialRow,
  id,
  children,
  userId,
}) {
  // const pathName = usePathname();
  const [row, setRow] = useState(initialRow);
  // const [loaded, setLoaded] = useState(isNew);
  const [loaded, setLoaded] = useState(true);
  // const loaded = true;
  const [confirm, setConfirm] = useState(false);
  // const [loadError, setLoadError] = useState();
  const [login, setLogin] = useState();

  useEffect(() => {
    if (isNew || !id) {
      // MUI was giving className mismatch errors on the Grid component. Load later to avoid
      setLoaded(true);
      return;
    }
  }, [isNew, modelName, id]);

  const context = useMemo(
    () => ({
      // loadError,
      loaded,
      row,
      setRow,
      modelName,
      isNew,
      id,
      confirm,
      setConfirm,
      login,
      setLogin,
      userId,
    }),
    [
      modelName,
      // loadError,
      loaded,
      row,
      isNew,
      id,
      confirm,
      login,
      userId,
    ],
  );

  /*
  if (!loaded) {
    return <Loading />;
  }
  */

  return <Context.Provider value={context}>{children}</Context.Provider>;
}
