"use client";

import { createContext, useContext, useState, useMemo } from "react";

const AdminEditContext = createContext({});
import { usePathname, useParams } from "next/navigation";

// import { useQuery } from "@kenstack/query";

export function AdminEditProvider({
  admin,
  isNew,
  row: initialRow,
  id,
  children,
  userId,
}) {
  const pathname = usePathname();
  const params = useParams();
  const apiPath = useMemo(() => {
    const suffix = params.admin ? params.admin.join("/") : "";
    return pathname.slice(0, -suffix.length) + "api/" + suffix;
  }, [params, pathname]);

  // const [row, setRow] = useState(initialRow);
  const [confirm, setConfirm] = useState(false);
  // const [loadError, setLoadError] = useState();
  const [login, setLogin] = useState();

  // let apiPath;
  // if (id) {
  //   const exp = new RegExp(`/${escapeRegExp(id)}($|/.+})`);
  //   apiPath = pathname.replace(exp, "") + `/api/${id}`;
  // } else {
  //   apiPath = pathname.slice(0, -3) + "api/new"; // strip 'new' from the end;
  //   console.log(apiPath, isNew, id);
  // }

  const store = useMemo(
    () => admin.form.createStore({ values: initialRow ?? {}, apiPath }),
    [initialRow, admin.form, apiPath],
  );

  // Keeping this around if we want to get a query into the mix.
  // const { data } = useQuery({
  //   queryKey: ["edit", id],
  //   queryFn: () => {
  //     console.log("trigger a fetch");
  //     return initialRow;
  //   },
  //   initialData: initialRow,
  //   initialDataUpdatedAt: Date.now(), // Signal that the data is fresh
  //   staleTime: Infinity, // Treat initial data as fresh to avoid initial fetch
  //   // enabled: false, // we only want to trigger the query manually
  // })

  const context = useMemo(
    () => ({
      // loadError,
      admin,
      store,
      // row,
      // setRow,
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
      store,
      // loadError,
      // row,
      isNew,
      id,
      confirm,
      login,
      userId,
      apiPath,
    ],
  );

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

export { AdminEditContext };
