"use client";

// import saveAction from "./saveAction";
import { useMutation } from "@kenstack/query";

import Form from "@kenstack/forms/Form";
import Toolbar from "./Toolbar";
import NoticeList from "@kenstack/components/Notice/List";
import AdminFields from "./Fields";
import Confirm from "./Confirm";
// import Login from "../LoginWindow";

import { useAdminEdit } from "./context";
import { usePathname } from "next/navigation";

import apiAction from "@kenstack/client/apiAction";

export default function AdminEditFormCont() {
  // const router = useRouter();
  const pathname = usePathname();
  const {
    // row,
    // loadError,
    // setRow,
    // setLogin,
    apiPath,
    store,
    id,
  } = useAdminEdit();
  // const arg = { isNew, id, pathName, modelName };
  // const saveActionBound = saveAction.bind(null, arg);
  // const saveActionBound = (state, formData) => {
  //   return apiAction(apiPath + "/save", formData, { pathname });
  // };

  // const handleResponse = useCallback(
  //   (evt, form) => {
  //     if (form.state?.login) {
  //       setLogin(form.state.login);
  //     } else if (form.state?.success && form.state?.row) {
  //       setRow(form.state.row);
  //     }

  //     if (form.state?.redirect) {
  //       let path = form.state?.redirect;
  //       if (pathname === path && path.endsWith("/new")) {
  //         form.reset();
  //       } else {
  //         router.push(path);
  //       }
  //     }
  //   },
  //   [pathname, router, setRow, setLogin],
  // );

  // <FormProvider
  //   // result="none"
  //   values={row}
  //   action={saveActionBound}
  // >

  const mutation = useMutation({
    queryKey: ["admin-edit", id],
    mutationFn: (formData) => {
      return apiAction(apiPath + "/save", formData, { pathname });
    },
    onSettled: ({ data }) => {
      // console.log("setteledd", data);
    },
    onSuccess: ({ data }) => {
      store.getState().setValues(data.row);
    },
    store,
  });

  return (
    <Form
      className="w-full"
      mutation={mutation}
      // onResponse={handleResponse}
      store={store}
    >
      <Confirm />
      {/*
        <Login login={login} setLogin={setLogin} />
        */}
      <Toolbar />
      <NoticeList store={store} />
      <AdminFields />
    </Form>
  );
}
