"use client";

import { createContext, useContext, useState, useMemo } from "react";

const AdminEditContext = createContext({});
import { usePathname, useParams } from "next/navigation";
import Notice from "@kenstack/components/Notice";

import { useQuery } from "@kenstack/query";
import apiAction from "@kenstack/client/apiAction";

export function AdminEditProvider({
  admin,
  isNew,
  row: initialRow,
  previous: initialPrevious,
  next: initialNext,
  id,
  children,
  userId,
}) {
  const pathname = usePathname();
  const basePathname = useMemo(
    () => pathname.replace(/\/(new|[0-9a-fA-F]{24})$/, ""),
    [pathname]
  );

  const params = useParams();
  const apiPath = useMemo(() => {
    const suffix = params.admin ? params.admin.join("/") : "";
    return pathname.slice(0, -suffix.length) + "api/" + suffix;
  }, [params, pathname]);

  const [confirm, setConfirm] = useState(false);
  // const [loadError, setLoadError] = useState();
  const [login, setLogin] = useState();

  const store = useMemo(
    () => admin.form.createStore({ values: initialRow ?? {}, apiPath }),
    [initialRow, admin.form, apiPath]
  );

  const { data, error } = useQuery({
    queryKey: ["admin-edit", id],
    queryFn: async () => {
      // console.log("trigger a fetch");
      const res = await apiAction(apiPath + "/load");
      if (res.success && res.doc) {
        // store.getState().setValues(res.doc);
      }
      return res;
    },
    initialData: {
      doc: initialRow,
      previous: initialPrevious,
      next: initialNext,
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: isNew === false,
  });

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
      basePathname,
      doc: data?.doc,
      previous: data?.previous,
      next: data?.next,
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
      basePathname,
      data,
    ]
  );

  if (data?.error || error) {
    return <Notice error={data?.error ?? error.message} />;
  }

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
      "Unable to fetch AdminEditContext. Please ensure that the admin edit Provider is present"
    );
  }

  return context;
}

export { AdminEditContext };
