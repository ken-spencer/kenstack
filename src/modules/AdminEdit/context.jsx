"use client";

import { createContext, useContext, useState, useEffect, useMemo } from "react";

const AdminEditContext = createContext({});
import { usePathname } from "next/navigation";
import escapeRegExp from "@kenstack/utils/escapeRegExp";

export function AdminEditProvider({
  admin,
  isNew,
  row: initialRow,
  id,
  children,
  userId,
}) {
  const pathname = usePathname();
  const [row, setRow] = useState(initialRow);
  // const [loaded, setLoaded] = useState(isNew);
  const [loaded, setLoaded] = useState(true);
  // const loaded = true;
  const [confirm, setConfirm] = useState(false);
  // const [loadError, setLoadError] = useState();
  const [login, setLogin] = useState();

  const exp = new RegExp(`/${escapeRegExp(id)}($|/.+})`);
  const apiPath = pathname.replace(exp, "") + `/api/${id}`;

  useEffect(() => {
    if (isNew || !id) {
      // MUI was giving className mismatch errors on the Grid component. Load later to avoid
      setLoaded(true);
      return;
    }
  }, [isNew, id]);

  const context = useMemo(
    () => ({
      // loadError,
      admin,
      loaded,
      row,
      setRow,
      isNew,
      id,
      confirm,
      setConfirm,
      login,
      setLogin,
      userId,
      apiPath,
    }),
    [
      admin,
      // loadError,
      loaded,
      row,
      isNew,
      id,
      confirm,
      login,
      userId,
      apiPath,
    ],
  );

  /*
  if (!loaded) {
    return <Loading />;
  }
  */

  return (
    <AdminEditContext.Provider value={context}>
      {children}
    </AdminEditContext.Provider>
  );
}

export function useAdminEdit() {
  const context = useContext(AdminEditContext);

  const keys = Object.keys(context);
  if (!keys.length) {
    throw Error(
      "Unable to fetch AdminEditContext. Please ensure that the admin edit Provider is present",
    );
  }

  return context;
}
